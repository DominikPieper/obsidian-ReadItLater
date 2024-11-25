import { Platform } from 'obsidian';

export enum PlatformType {
    Linux,
    MacOS,
    Windows,
    Android,
    iOS,
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
    } else {
        if (Platform.isAndroidApp) {
            return PlatformType.Android;
        }
        if (Platform.isIosApp) {
            return PlatformType.iOS;
        }
    }

    throw new Error('Unable to detect platform type');
}
