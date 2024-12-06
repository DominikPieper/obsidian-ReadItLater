import { Delimiter } from './enums/delimiter';

export interface ReadItLaterSettings {
    inboxDir: string;
    assetsDir: string;
    openNewNote: boolean;
    batchProcess: boolean;
    batchProcessDelimiter: Delimiter;
    openNewNoteInNewTab: boolean;
    youtubeContentTypeSlug: string;
    youtubeNoteTitle: string;
    youtubeNote: string;
    youtubeEmbedWidth: string;
    youtubeEmbedHeight: string;
    youtubeUsePrivacyEnhancedEmbed: boolean;
    vimeoContentTypeSlug: string;
    vimeoNoteTitle: string;
    vimeoNote: string;
    vimeoEmbedWidth: string;
    vimeoEmbedHeight: string;
    bilibiliContentTypeSlug: string;
    bilibiliNoteTitle: string;
    bilibiliNote: string;
    bilibiliEmbedWidth: string;
    bilibiliEmbedHeight: string;
    twitterContentTypeSlug: string;
    twitterNoteTitle: string;
    twitterNote: string;
    parseableArticleContentType: string;
    parseableArticleNoteTitle: string;
    parsableArticleNote: string;
    notParseableArticleContentType: string;
    notParseableArticleNoteTitle: string;
    notParsableArticleNote: string;
    textSnippetContentType: string;
    textSnippetNoteTitle: string;
    textSnippetNote: string;
    mastodonContentTypeSlug: string;
    mastodonNoteTitle: string;
    mastodonNote: string;
    downloadImages: boolean;
    downloadImagesInArticleDir: boolean;
    dateTitleFmt: string;
    dateContentFmt: string;
    downloadMastodonMediaAttachments: boolean;
    downloadMastodonMediaAttachmentsInDir: boolean;
    saveMastodonReplies: boolean;
    mastodonReply: string;
    stackExchangeContentType: string;
    stackExchangeNoteTitle: string;
    stackExchangeNote: string;
    stackExchangeAnswer: string;
    downloadStackExchangeAssets: boolean;
    downloadStackExchangeAssetsInDir: boolean;
    youtubeApiKey: string;
    tikTokContentTypeSlug: string;
    tikTokNoteTitle: string;
    tikTokNote: string;
    tikTokEmbedWidth: string;
    tikTokEmbedHeight: string;
    extendShareMenu: boolean;
    filesystemLimitPath: number | null;
    filesystemLimitFileName: number | null;
    youtubeChannelContentTypeSlug: string;
    youtubeChannelNoteTitle: string;
    youtubeChannelNote: string;
}

export const DEFAULT_SETTINGS: ReadItLaterSettings = {
    inboxDir: 'ReadItLater Inbox',
    assetsDir: 'ReadItLater Inbox/assets',
    openNewNote: false,
    batchProcess: false,
    batchProcessDelimiter: Delimiter.NewLine,
    openNewNoteInNewTab: false,
    youtubeContentTypeSlug: 'youtube',
    youtubeNoteTitle: 'Youtube - {{ title }}',
    youtubeNote: '[[ReadItLater]] [[Youtube]]\n\n# [{{ videoTitle }}]({{ videoURL }})\n\n{{ videoPlayer }}',
    youtubeEmbedWidth: '560',
    youtubeEmbedHeight: '315',
    youtubeUsePrivacyEnhancedEmbed: true,
    vimeoContentTypeSlug: 'vimeo',
    vimeoNoteTitle: 'Vimeo - {{ title }}',
    vimeoNote: '[[ReadItLater]] [[Vimeo]]\n\n# [{{ videoTitle }}]({{ videoURL }})\n\n{{ videoPlayer }}',
    vimeoEmbedWidth: '560',
    vimeoEmbedHeight: '315',
    bilibiliContentTypeSlug: 'bilibili',
    bilibiliNoteTitle: 'Bilibili - {{ title }}',
    bilibiliNote: '[[ReadItLater]] [[Bilibili]]\n\n# [{{ videoTitle }}]({{ videoURL }})\n\n{{ videoPlayer }}',
    bilibiliEmbedWidth: '560',
    bilibiliEmbedHeight: '315',
    twitterContentTypeSlug: 'xcom',
    twitterNoteTitle: 'Tweet from {{ tweetAuthorName }} ({{ date }})',
    twitterNote: '[[ReadItLater]] [[Tweet]]\n\n# [{{ tweetAuthorName }}]({{ tweetURL }})\n\n{{ tweetContent }}',
    parseableArticleContentType: 'article',
    parseableArticleNoteTitle: '{{ title }}',
    parsableArticleNote:
        '[[ReadItLater]] [[Article]]\n\n# [{{ articleTitle }}]({{ articleURL }})\n\n{{ articleContent }}',
    notParseableArticleContentType: 'article',
    notParseableArticleNoteTitle: 'Article {{ date }}',
    notParsableArticleNote: '[[ReadItLater]] [[Article]]\n\n[{{ articleURL }}]({{ articleURL }})',
    textSnippetContentType: 'textsnippet',
    textSnippetNoteTitle: 'Note {{ date }}',
    textSnippetNote: '[[ReadItLater]] [[Textsnippet]]\n\n{{ content }}',
    mastodonContentTypeSlug: 'mastodon',
    mastodonNoteTitle: 'Toot from {{ tootAuthorName }} ({{ date }})',
    mastodonNote: '[[ReadItLater]] [[Toot]]\n\n# [{{ tootAuthorName }}]({{ tootURL }})\n\n> {{ tootContent }}',
    downloadImages: true,
    downloadImagesInArticleDir: false,
    dateTitleFmt: 'YYYY-MM-DD HH-mm-ss',
    dateContentFmt: 'YYYY-MM-DD',
    downloadMastodonMediaAttachments: true,
    downloadMastodonMediaAttachmentsInDir: false,
    saveMastodonReplies: false,
    mastodonReply: '[{{ tootAuthorName }}]({{ tootURL }})\n\n> {{ tootContent }}',
    stackExchangeContentType: 'stackexchange',
    stackExchangeNoteTitle: '{{ title }}',
    stackExchangeNote:
        '[[ReadItLater]] [[StackExchange]]\n\n# [{{ questionTitle }}]({{ questionURL }})\n\nAuthor: [{{ authorName }}]({{ authorProfileURL }})\n\n{{ questionContent }}\n\n***\n\n{{ topAnswer }}\n\n{{ answers }}',
    stackExchangeAnswer: 'Answered by: [{{ authorName }}]({{ authorProfileURL }})\n\n{{ answerContent }}',
    downloadStackExchangeAssets: true,
    downloadStackExchangeAssetsInDir: false,
    youtubeApiKey: '',
    tikTokContentTypeSlug: 'tiktok',
    tikTokNoteTitle: 'TikTok from {{ authorName }} ({{ date }})',
    tikTokNote:
        '[[ReadItLater]] [[TikTok]]\n\n{{ videoDescription }}\n\n[{{ videoURL }}]({{ videoURL }})\n\n{{ videoPlayer }}',
    tikTokEmbedWidth: '325',
    tikTokEmbedHeight: '760',
    extendShareMenu: true,
    filesystemLimitPath: null,
    filesystemLimitFileName: null,
    youtubeChannelContentTypeSlug: 'youtube-channel',
    youtubeChannelNoteTitle: '{{ title }}',
    youtubeChannelNote: '[[ReadItLater]] [[YoutubeChannel]]\n\n# [{{ channelTitle }}]({{ channelURL }})\n\n{{ channelSubscribersCount|numberLexify }} subscribers',
};
