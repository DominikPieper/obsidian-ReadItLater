export interface ReadItLaterSettings {
    inboxDir: string;
    assetsDir: string;
    openNewNote: boolean;
    youtubeNoteTitle: string;
    youtubeNote: string;
    bilibiliNoteTitle: string;
    bilibiliNote: string;
    twitterNoteTitle: string;
    twitterNote: string;
    parseableArticleNoteTitle: string;
    parsableArticleNote: string;
    notParseableArticleNoteTitle: string;
    notParsableArticleNote: string;
    textSnippetNoteTitle: string;
    textSnippetNote: string;
    downloadImages: boolean;
    downloadImagesInArticleDir: boolean;
    dateTitleFmt: string;
    dateContentFmt: string;
}

export const DEFAULT_SETTINGS: ReadItLaterSettings = {
    inboxDir: 'ReadItLater Inbox',
    assetsDir: 'ReadItLater Inbox/assets',
    openNewNote: false,
    youtubeNoteTitle: 'Youtube - %title%',
    youtubeNote: `[[ReadItLater]] [[Youtube]]\n\n# [%videoTitle%](%videoURL%)\n\n%videoPlayer%`,
    bilibiliNoteTitle: 'Bilibili - %title%',
    bilibiliNote: `[[ReadItLater]] [[Bilibili]]\n\n# [%videoTitle%](%videoURL%)\n\n%videoPlayer%`,
    twitterNoteTitle: 'Tweet from %tweetAuthorName% (%date%)',
    twitterNote: `[[ReadItLater]] [[Tweet]]\n\n# [%tweetAuthorName%](%tweetURL%)\n\n%tweetContent%`,
    parseableArticleNoteTitle: '%title%',
    parsableArticleNote: `[[ReadItLater]] [[Article]]\n\n# [%articleTitle%](%articleURL%)\n\n%articleContent%`,
    notParseableArticleNoteTitle: 'Article %date%',
    notParsableArticleNote: `[[ReadItLater]] [[Article]]\n\n[%articleURL%](%articleURL%)`,
    textSnippetNoteTitle: 'Notice %date%',
    textSnippetNote: `[[ReadItLater]] [[Textsnippet]]\n\n%content%`,
    downloadImages: true,
    downloadImagesInArticleDir: false,
    dateTitleFmt: 'YYYY-MM-DD HH-mm-ss',
    dateContentFmt: 'YYYY-MM-DD',
};
