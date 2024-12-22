import { Notice, request } from 'obsidian';
import { Note } from './Note';
import { Parser } from './Parser';

interface PostId {
    handle: string;
    id: string;
}

type MediaAttachmentType = 'image' | 'video';

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
}

interface Post extends PostData {
    replies: PostReply[];
}

interface PostReply extends PostData { }

interface BlueskyPostNoteData {
    date: string;
    content: string;
    postURL: string;
    authorName: string;
    likesCount: number;
    extra: {
        post: Post;
    };
}

export class BlueskyParser extends Parser {
    private PATTERN = /^https:\/\/bsky\.app\/profile\/(?<handle>[a-zA-Z0-9-.]+)\/post\/(?<postId>[a-zA-Z0-9]+)$/;
    private AT_URI_PATTERN =
        /^at:\/\/(?<handle>(?:did:plc:[a-zA-Z0-9]+|[a-zA-Z0-9.-]+(?:\.[a-zA-Z0-9.-]+)*?))\/(?<collection>[a-zA-Z.]+)\/(?<rkey>[a-zA-Z0-9]+)$/;

    private EMBED_IMAGE_TYPE = 'app.bsky.embed.images#view';
    private EMBED_VIDEO_TYPE = 'app.bsky.embed.video#view';

    test(clipboardContent: string): boolean {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        const createdAt = new Date();
        const post = await this.loadPost(clipboardContent);

        console.log(post);

        return new Note('', 'md', '', '', createdAt);
    }

    private async formatPostContent(post: Post): Promise<string> {
        let formattedPostContent = post.content + this.formatPostMediaAttachment(post.mediaAttachments);

        if (this.plugin.settings.saveBlueskyPostReplies) {

        }
    }

    private formatPostMediaAttachment(mediaAttachments: MediaAttachment[]): string {
        let formattedPostMediaAttachments = '';

        mediaAttachments.forEach((attachment) => {
            formattedPostMediaAttachments.concat('\n\n', `![${attachment.description}](${attachment.url})`);
        });

        return formattedPostMediaAttachments;
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
                    ? this.createMediaAttachments(reply.post.embed, replyPostUrl)
                    : [],
            });
        });

        return {
            url: postUrl,
            content: response.thread.post.record.text,
            author: { ...response.thread.post.author },
            mediaAttachments: Object.prototype.hasOwnProperty.call(response.thread.post, 'embed')
                ? this.createMediaAttachments(response.thread.post.embed, postUrl)
                : [],
            replies: replies,
        };
    }

    private createMediaAttachments(responseEmbed: any, postUrl: string): MediaAttachment[] {
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
        }

        return mediaAttachments;
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
