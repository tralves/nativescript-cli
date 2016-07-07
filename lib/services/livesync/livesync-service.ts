import * as constants from "../../constants";
import * as helpers from "../../common/helpers";
import * as path from "path";
import * as semver from "semver";

class LiveSyncService implements ILiveSyncService {
	public forceExecuteFullSync = false;
	private _isInitialized = false;

	constructor(private $devicePlatformsConstants: Mobile.IDevicePlatformsConstants,
		private $errors: IErrors,
		private $liveSyncServiceBase: ILiveSyncServiceBase,
		private $platformsData: IPlatformsData,
		private $platformService: IPlatformService,
		private $projectData: IProjectData,
		private $projectDataService: IProjectDataService,
		private $prompter: IPrompter,
		private $injector: IInjector,
		private $mobileHelper: Mobile.IMobileHelper,
		private $devicesService: Mobile.IDevicesService,
		private $options: IOptions) { }

	private ensureAndroidFrameworkVersion(platformData: IPlatformData): IFuture<void> { // TODO: this can be moved inside command or canExecute function
		return (() => {
			this.$projectDataService.initialize(this.$projectData.projectDir);
			let frameworkVersion = this.$projectDataService.getValue(platformData.frameworkPackageName).wait().version;

			if (platformData.normalizedPlatformName.toLowerCase() === this.$devicePlatformsConstants.Android.toLowerCase()) {
				if (semver.lt(frameworkVersion, "1.2.1")) {
					let shouldUpdate = this.$prompter.confirm("You need Android Runtime 1.2.1 or later for LiveSync to work properly. Do you want to update your runtime now?").wait();
					if (shouldUpdate) {
						this.$platformService.updatePlatforms([this.$devicePlatformsConstants.Android.toLowerCase()]).wait();
					} else {
						return;
					}
				}
			}
		}).future<void>()();
	}

	public get isInitialized(): boolean { // This function is used from https://github.com/NativeScript/nativescript-dev-typescript/blob/master/lib/before-prepare.js#L4
		return this._isInitialized;
	}

	public liveSync(platform: string): IFuture<void> {
		return (() => {
			let liveSyncData: ILiveSyncData[] = [];
			this.$devicesService.initialize({ skipInferPlatform: true }).wait();
			if (platform) {
				liveSyncData.push(this.prepareLiveSyncData(platform));
			} else if (this.$options.device) {
				platform = this.$devicesService.getDeviceByIdentifier(this.$options.device).deviceInfo.platform;
				liveSyncData.push(this.prepareLiveSyncData(platform));
			} else {
				for(let installedPlatform of this.$platformService.getInstalledPlatforms().wait()) {
					liveSyncData.push(this.prepareLiveSyncData(installedPlatform));
				}
			}

			this._isInitialized = true; // If we want before-prepare hooks to work properly, this should be set after preparePlatform function

			this.liveSyncCore(liveSyncData).wait();
		}).future<void>()();
	}

	private prepareLiveSyncData(platform: string): ILiveSyncData {
		platform = this.$liveSyncServiceBase.getPlatform(platform).wait();
		if (!this.$platformService.preparePlatform(platform.toLowerCase()).wait()) {
			this.$errors.failWithoutHelp("Verify that listed files are well-formed and try again the operation.");
		}

		let platformData = this.$platformsData.getPlatformData(platform.toLowerCase());
		if (this.$mobileHelper.isAndroidPlatform(platform)) {
			this.ensureAndroidFrameworkVersion(platformData).wait();
		}
		let liveSyncData: ILiveSyncData = {
			platform: platform,
			appIdentifier: this.$projectData.projectId,
			projectFilesPath: path.join(platformData.appDestinationDirectoryPath, constants.APP_FOLDER_NAME),
			syncWorkingDirectory: path.join(this.$projectData.projectDir, constants.APP_FOLDER_NAME),
			excludedProjectDirsAndFiles: this.$options.release ? constants.LIVESYNC_EXCLUDED_FILE_PATTERNS : [],
			forceExecuteFullSync: this.forceExecuteFullSync
		};

		return liveSyncData;
	}

	@helpers.hook('livesync')
	private liveSyncCore(liveSyncData: ILiveSyncData[]): IFuture<void> {
		return (() => {
			this.$liveSyncServiceBase.sync(liveSyncData).wait();
		}).future<void>()();
	}
}
$injector.register("usbLiveSyncService", LiveSyncService);
