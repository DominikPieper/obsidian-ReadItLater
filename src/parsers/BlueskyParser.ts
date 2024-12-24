import { Notice, moment, request } from 'obsidian';
import { normalizeFilename } from 'src/helpers/fileutils';
import { replaceImages } from 'src/helpers/replaceImages';
import { Note } from './Note';
import { Parser } from './Parser';

interface BaseFacet {
    byteStart: number;
    byteEnd: number;
    type: FacetType;
}

interface MentionFacet extends BaseFacet {
    type: FacetType.Mention;
    did: string;
}

interface LinkFacet extends BaseFacet {
    type: FacetType.Link;
    uri: string;
}

interface TagFacet extends BaseFacet {
    type: FacetType.Tag;
    tag: string;
}

type Facet = MentionFacet | LinkFacet | TagFacet;

enum FacetType {
    Mention = 'mention',
    Link = 'link',
    Tag = 'tag',
}

interface PostId {
    handle: string;
    id: string;
}

type MediaAttachmentType = 'image' | 'video' | 'external';

interface MediaAttachment {
    type: MediaAttachmentType;
    url: string;
    thumbnail: string;
    description: string;
}

interface Author {
    did: string;
    displayName: string;
    handle: string;
    avatar: string;
}

interface PostData {
    url: string;
    content: string;
    author: Author;
    mediaAttachments: MediaAttachment[];
    likeCount: number;
    replyCount: number;
    repostCount: number;
    quoteCount: number;
    publishedAt: Date;
    facets: Facet[];
}

interface Post extends PostData {
    replies: PostReply[];
}

interface PostReply extends PostData {}

interface BlueskyNoteData {
    date: string;
    content: string;
    postURL: string;
    authorHandle: string;
    authorName: string;
    likeCount: number;
    replyCount: number;
    repostCount: number;
    quoteCount: number;
    publishedAt: string;
    extra: {
        post: PostData;
    };
}

export class BlueskyParser extends Parser {
    private PATTERN = /^https:\/\/bsky\.app\/profile\/(?<handle>[a-zA-Z0-9-.]+)\/post\/(?<postId>[a-zA-Z0-9]+)$/;
    private AT_URI_PATTERN =
        /^at:\/\/(?<handle>(?:did:plc:[a-zA-Z0-9]+|[a-zA-Z0-9.-]+(?:\.[a-zA-Z0-9.-]+)*?))\/(?<collection>[a-zA-Z.]+)\/(?<rkey>[a-zA-Z0-9]+)$/;

    private EMBED_IMAGE_TYPE = 'app.bsky.embed.images#view';
    private EMBED_VIDEO_TYPE = 'app.bsky.embed.video#view';
    private EMBED_EXTERNAL_TYPE = 'app.bsky.embed.external#view';

    public test(clipboardContent: string): boolean {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    public async prepareNote(clipboardContent: string): Promise<Note> {
        const createdAt = new Date();
        const post = await this.loadPost(clipboardContent);

        let formattedPostContent = this.formatPostContent(post, createdAt);

        if (this.plugin.settings.saveBlueskyPostReplies) {
            post.replies.forEach((reply) => {
                formattedPostContent = formattedPostContent.concat(
                    '\n\n***\n\n',
                    this.formatPostContent(reply, createdAt, true),
                );
            });
        }

        const fileName = this.templateEngine.render(this.plugin.settings.blueskyNoteTitle, {
            date: this.getFormattedDateForFilename(createdAt),
            authorHandle: post.author.handle,
            authorName: post.author.displayName,
        });

        if (this.plugin.settings.downloadBlueskyMediaAttachments) {
            let assetsDir;
            if (this.plugin.settings.downloadBlueskyMediaAttachmentsInDir) {
                assetsDir = this.templateEngine.render(this.plugin.settings.assetsDir, {
                    date: '',
                    fileName: '',
                    contentType: '',
                });
                assetsDir = `${assetsDir}/${normalizeFilename(fileName)}`;
            } else {
                assetsDir = this.templateEngine.render(this.plugin.settings.assetsDir, {
                    date: this.getFormattedDateForFilename(createdAt),
                    fileName: normalizeFilename(fileName),
                    contentType: this.plugin.settings.mastodonContentTypeSlug,
                });
            }

            formattedPostContent = await replaceImages(this.plugin, normalizeFilename(fileName), formattedPostContent, assetsDir);
        }

        return new Note(fileName, 'md', formattedPostContent, this.plugin.settings.blueskyContentTypeSlug, createdAt);
    }

    private async loadPost(postUrl: string): Promise<Post> {
        const postUri = this.getPostUri(this.getPostIdFromUrl(postUrl));

        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${postUri}`,
            }),
        );

        const replies: PostReply[] = [];

        response.thread.replies.forEach((reply: any) => {
            const replyPostUrl = this.getPostUrl(this.getPostIdFromAtUri(reply.post.uri));
            replies.push({
                url: replyPostUrl,
                content: reply.post.record.text,
                author: { ...reply.post.author },
                mediaAttachments: Object.prototype.hasOwnProperty.call(reply.post, 'embed')
                    ? this.makeMediaAttachments(reply.post.embed, replyPostUrl)
                    : [],
                likeCount: reply.post.likeCount,
                replyCount: reply.post.replyCount,
                repostCount: reply.post.repostCount,
                quoteCount: reply.post.replyCount,
                publishedAt: moment(reply.post.record.createdAt).toDate(),
                facets:
                    reply.post.record?.facets?.map((facet: any) => {
                        return this.makeFacet(facet);
                    }) ?? [],
            });
        });

        return {
            url: postUrl,
            content: response.thread.post.record.text,
            author: { ...response.thread.post.author },
            mediaAttachments: Object.prototype.hasOwnProperty.call(response.thread.post, 'embed')
                ? this.makeMediaAttachments(response.thread.post.embed, postUrl)
                : [],
            likeCount: response.thread.post.likeCount,
            replyCount: response.thread.post.replyCount,
            repostCount: response.thread.post.repostCount,
            quoteCount: response.thread.post.replyCount,
            publishedAt: moment(response.thread.post.record.createdAt).toDate(),
            facets:
                response.thread.post.record?.facets?.map((facet: any) => {
                    return this.makeFacet(facet);
                }) ?? [],
            replies: replies,
        };
    }

    private makeMediaAttachments(responseEmbed: any, postUrl: string): MediaAttachment[] {
        const mediaAttachments: MediaAttachment[] = [];

        if (responseEmbed.$type === this.EMBED_IMAGE_TYPE) {
            responseEmbed.images.forEach((image: any) => {
                mediaAttachments.push({
                    type: 'image',
                    url: image.fullsize,
                    thumbnail: image.thumb,
                    description: image.alt,
                });
            });
        } else if (responseEmbed.$type === this.EMBED_VIDEO_TYPE) {
            mediaAttachments.push({
                type: 'video',
                url: postUrl,
                thumbnail: responseEmbed.thumbnail,
                description: '',
            });
        } else if (responseEmbed.$type === this.EMBED_EXTERNAL_TYPE) {
            mediaAttachments.push({
                type: 'external',
                url: responseEmbed.external.uri,
                thumbnail: responseEmbed.external.thumb,
                description: responseEmbed.external?.title || responseEmbed.external.alt || ''
            });
        }

        return mediaAttachments;
    }

    private makeFacet(facetResponse: any): Facet {
        if (facetResponse.features?.[0].$type === 'app.bsky.richtext.facet#mention') {
            return {
                type: FacetType.Mention,
                did: facetResponse.features?.[0].did,
                byteStart: facetResponse.index.byteStart,
                byteEnd: facetResponse.index.byteEnd,
            };
        } else if (facetResponse.features?.[0].$type === 'app.bsky.richtext.facet#tag') {
            return {
                type: FacetType.Tag,
                tag: facetResponse.features?.[0].tag,
                byteStart: facetResponse.index.byteStart,
                byteEnd: facetResponse.index.byteEnd,
            };
        } else if (facetResponse.features?.[0].$type === 'app.bsky.richtext.facet#link') {
            return {
                type: FacetType.Link,
                uri: facetResponse.features?.[0].uri,
                byteStart: facetResponse.index.byteStart,
                byteEnd: facetResponse.index.byteEnd,
            };
        }

        throw new Error(`Unrecognized facet type ${facetResponse}`);
    }

    private formatPostContent(post: PostData, createdAt: Date, useReplyTemplate: boolean = false): string {
        let formattedPostMediaAttachments = '';

        post.mediaAttachments.forEach((attachment) => {
            let formattedAttachment;
            if (attachment.type === 'video') {
                formattedAttachment = `[Watch video on Bluesky](${attachment.url})`;
            } else if (attachment.type === 'external') {
                formattedAttachment = `![${attachment.description}](${attachment.thumbnail})\n${attachment.url}`;
            } else {
                formattedAttachment = `![](${attachment.thumbnail})\n${attachment.description}`;
            }

            formattedPostMediaAttachments = formattedPostMediaAttachments.concat(
                '\n\n',
                formattedAttachment,
            );
        });

        const content = this.replaceFacets(post) + formattedPostMediaAttachments;

        return this.renderPost(
            useReplyTemplate ? this.plugin.settings.blueskyPostReply : this.plugin.settings.blueskyNote,
            {
                date: this.getFormattedDateForContent(createdAt),
                content: content,
                postURL: post.url,
                authorHandle: post.author.handle,
                authorName: post.author.displayName || post.author.handle,
                likeCount: post.likeCount,
                replyCount: post.replyCount,
                repostCount: post.repostCount,
                quoteCount: post.quoteCount,
                publishedAt: this.getFormattedDateForContent(post.publishedAt),
                extra: {
                    post: post,
                },
            },
        );
    }

    private replaceFacets(post: PostData): string {
        if (post.facets.length === 0) {
            return post.content;
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const bytes = encoder.encode(post.content);

        // Sort facets by position
        const sortedFacets = [...post.facets].sort((a, b) => a.byteStart - b.byteStart);

        let result = '';
        let lastPos = 0;

        for (const facet of sortedFacets) {
            // Add text before the facet
            result += decoder.decode(bytes.slice(lastPos, facet.byteStart));

            // Extract facet text
            const facetText = decoder.decode(bytes.slice(facet.byteStart, facet.byteEnd));

            // Format based on facet type
            switch (facet.type) {
                case FacetType.Mention:
                    result += `[${facetText}](https://bsky.app/profile/${facet.did})`;
                    break;
                case FacetType.Link:
                    result += `[${facetText}](${facet.uri})`;
                    break;
                case FacetType.Tag:
                    result += `[${facetText}](https://bsky.app/search?q=${encodeURIComponent(facet.tag)})`;
                    break;
            }

            lastPos = facet.byteEnd;
        }

        // Add remaining text
        if (lastPos < bytes.length) {
            result += decoder.decode(bytes.slice(lastPos));
        }

        return result;
    }

    private renderPost(template: string, noteData: BlueskyNoteData): string {
        return this.templateEngine.render(template, noteData);
    }

    private getPostUrl(postId: PostId): string {
        return `https://bsky.app/profile/${postId.handle}/post/${postId.id}`;
    }

    private getPostUri(postId: PostId): string {
        return `at://${postId.handle}/app.bsky.feed.post/${postId.id}`;
    }

    private getPostIdFromUrl(url: string): PostId {
        const match = url.match(this.PATTERN);
        if (!match) {
            const errorMessage = `Unable to determine handle and id from provided url ${url}`;
            new Notice(errorMessage);
            throw new Error(errorMessage);
        }

        return {
            handle: match.groups.handle,
            id: match.groups.postId,
        };
    }

    private getPostIdFromAtUri(atUri: string): PostId {
        const match = atUri.match(this.AT_URI_PATTERN);
        if (!match) {
            const errorMessage = `Unable to determine handle and id from provided AT uri ${atUri}`;
            new Notice(errorMessage);
            throw new Error(errorMessage);
        }

        return {
            handle: match.groups.handle,
            id: match.groups.rkey,
        };
    }
}
