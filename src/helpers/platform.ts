import { Platform } from 'obsidian';

export enum PlatformType {
    Linux,
    MacOS,
    Windows,
    Android,
    iOS,
    Desktop,
    Mobile,
}

export function getPlatformType(): PlatformType {
    if (Platform.isDesktop) {
        if (Platform.isLinux) {
            return PlatformType.Linux;
        }
        if (Platform.isMacOS) {
            return PlatformType.MacOS;
        }
        if (Platform.isWin) {
            return PlatformType.Windows;
        }
        return PlatformType.Desktop;
    } else {
        if (Platform.isAndroidApp) {
            return PlatformType.Android;
        }
        if (Platform.isIosApp) {
            return PlatformType.iOS;
        }
        return PlatformType.Mobile;
    }
}
