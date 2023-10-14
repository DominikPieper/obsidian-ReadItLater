
export enum ImageBehavior {
    SaveToAssetDir = "save_to_asset_directory",
    SaveToNoteDir = "save_to_note_directory",
    EmbedBase64 = "embed_images_using_base64",
    DoNotSave = "do_not_save_images"
}


export interface ReadItLaterSettings {
    inboxDir: string;
    assetsDir: string;
    openNewNote: boolean;
    youtubeNoteTitle: string;
    youtubeNote: string;
    youtubeEmbedWidth: string;
    youtubeEmbedHeight: string;
    youtubeUsePrivacyEnhancedEmbed: boolean;
    vimeoNoteTitle: string;
    vimeoNote: string;
    vimeoEmbedWidth: string;
    vimeoEmbedHeight: string;
    bilibiliNoteTitle: string;
    bilibiliNote: string;
    bilibiliEmbedWidth: string;
    bilibiliEmbedHeight: string;
    twitterNoteTitle: string;
    twitterNote: string;
    parseableArticleNoteTitle: string;
    parsableArticleNote: string;
    notParseableArticleNoteTitle: string;
    notParsableArticleNote: string;
    textSnippetNoteTitle: string;
    textSnippetNote: string;
    mastodonNoteTitle: string;
    mastodonNote: string;
    articleImageBehavior: ImageBehavior;
    dateTitleFmt: string;
    dateContentFmt: string;
    mastodonImageBehavior: ImageBehavior;
    saveMastodonReplies: boolean;
    mastodonReply: string;
    stackExchangeNoteTitle: string;
    stackExchangeNote: string;
    stackExchangeAnswer: string;
    stackExchangeImageBehavior: ImageBehavior;
    youtubeApiKey: string;
    tikTokNoteTitle: string;
    tikTokNote: string;
    tikTokEmbedWidth: string;
    tikTokEmbedHeight: string;
    extendShareMenu: boolean;
}

export const DEFAULT_SETTINGS: ReadItLaterSettings = {
    inboxDir: 'ReadItLater Inbox',
    assetsDir: 'ReadItLater Inbox/assets',
    openNewNote: false,
    youtubeNoteTitle: 'Youtube - %title%',
    youtubeNote: '[[ReadItLater]] [[Youtube]]\n\n# [%videoTitle%](%videoURL%)\n\n%videoPlayer%',
    youtubeEmbedWidth: '560',
    youtubeEmbedHeight: '315',
    youtubeUsePrivacyEnhancedEmbed: true,
    vimeoNoteTitle: 'Vimeo - %title%',
    vimeoNote: '[[ReadItLater]] [[Vimeo]]\n\n# [%videoTitle%](%videoURL%)\n\n%videoPlayer%',
    vimeoEmbedWidth: '560',
    vimeoEmbedHeight: '315',
    bilibiliNoteTitle: 'Bilibili - %title%',
    bilibiliNote: '[[ReadItLater]] [[Bilibili]]\n\n# [%videoTitle%](%videoURL%)\n\n%videoPlayer%',
    bilibiliEmbedWidth: '560',
    bilibiliEmbedHeight: '315',
    twitterNoteTitle: 'Tweet from %tweetAuthorName% (%date%)',
    twitterNote: '[[ReadItLater]] [[Tweet]]\n\n# [%tweetAuthorName%](%tweetURL%)\n\n%tweetContent%',
    parseableArticleNoteTitle: '%title%',
    parsableArticleNote: '[[ReadItLater]] [[Article]]\n\n# [%articleTitle%](%articleURL%)\n\n%articleContent%',
    notParseableArticleNoteTitle: 'Article %date%',
    notParsableArticleNote: '[[ReadItLater]] [[Article]]\n\n[%articleURL%](%articleURL%)',
    textSnippetNoteTitle: 'Note %date%',
    textSnippetNote: '[[ReadItLater]] [[Textsnippet]]\n\n%content%',
    mastodonNoteTitle: 'Toot from %tootAuthorName% (%date%)',
    mastodonNote: '[[ReadItLater]] [[Toot]]\n\n# [%tootAuthorName%](%tootURL%)\n\n> %tootContent%',
    articleImageBehavior: ImageBehavior.SaveToAssetDir,
    dateTitleFmt: 'YYYY-MM-DD HH-mm-ss',
    dateContentFmt: 'YYYY-MM-DD',
    mastodonImageBehavior: ImageBehavior.SaveToAssetDir,
    saveMastodonReplies: false,
    mastodonReply: '[%tootAuthorName%](%tootURL%)\n\n> %tootContent%',
    stackExchangeNoteTitle: '%title%',
    stackExchangeNote:
        '[[ReadItLater]] [[StackExchange]]\n\n# [%questionTitle%](%questionURL%)\n\nAuthor: [%authorName%](%authorProfileURL%)\n\n%questionContent%\n\n***\n\n%topAnswer%\n\n%answers%',
    stackExchangeAnswer: 'Answered by: [%authorName%](%authorProfileURL%)\n\n%answerContent%',
    stackExchangeImageBehavior: ImageBehavior.SaveToAssetDir,
    youtubeApiKey: '',
    tikTokNoteTitle: 'TikTok from %authorName% (%date%)',
    tikTokNote: '[[ReadItLater]] [[TikTok]]\n\n%videoDescription%\n\n[%videoURL%](%videoURL%)\n\n%videoPlayer%',
    tikTokEmbedWidth: '325',
    tikTokEmbedHeight: '760',
    extendShareMenu: true,
};
