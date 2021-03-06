import { EventEmitter } from "events";
import { DeviceDiscoveryEventNames, EmulatorDiscoveryNames, DEVICE_LOG_EVENT_NAME } from "../constants";

export class DeviceEmitter extends EventEmitter {
	constructor(private $deviceLogProvider: EventEmitter,
		private $devicesService: Mobile.IDevicesService) {
		super();

		this.initialize();
	}

	public initialize(): void {
		this.$devicesService.on(DeviceDiscoveryEventNames.DEVICE_FOUND, (device: Mobile.IDevice) => {
			this.emit(DeviceDiscoveryEventNames.DEVICE_FOUND, device.deviceInfo);
			this.attachApplicationChangedHandlers(device);

			// await: Do not await as this will require to mark the lambda with async keyword, but there's no way to await the lambda itself.
			/* tslint:disable:no-floating-promises */
			device.openDeviceLogStream();
			/* tslint:enable:no-floating-promises */
		});

		this.$devicesService.on(DeviceDiscoveryEventNames.DEVICE_LOST, (device: Mobile.IDevice) => {
			this.emit(DeviceDiscoveryEventNames.DEVICE_LOST, device.deviceInfo);
		});

		this.$devicesService.on(DeviceDiscoveryEventNames.DEVICE_UPDATED, (device: Mobile.IDevice) => {
			this.emit(DeviceDiscoveryEventNames.DEVICE_UPDATED, device.deviceInfo);
		});

		this.$deviceLogProvider.on("data", (identifier: string, data: any) => {
			this.emit(DEVICE_LOG_EVENT_NAME, identifier, data.toString());
		});

		this.$devicesService.on(EmulatorDiscoveryNames.EMULATOR_IMAGE_FOUND, (emulator: Mobile.IDeviceInfo) => {
			this.emit(EmulatorDiscoveryNames.EMULATOR_IMAGE_FOUND, emulator);
		});

		this.$devicesService.on(EmulatorDiscoveryNames.EMULATOR_IMAGE_LOST, (emulator: Mobile.IDeviceInfo) => {
			this.emit(EmulatorDiscoveryNames.EMULATOR_IMAGE_LOST, emulator);
		});
	}

	private attachApplicationChangedHandlers(device: Mobile.IDevice): void {
		device.applicationManager.on("applicationInstalled", (appIdentifier: string) => {
			this.emit("applicationInstalled", device.deviceInfo.identifier, appIdentifier);
		});

		device.applicationManager.on("applicationUninstalled", (appIdentifier: string) => {
			this.emit("applicationUninstalled", device.deviceInfo.identifier, appIdentifier);
		});

		device.applicationManager.on("debuggableAppFound", (debuggableAppInfo: Mobile.IDeviceApplicationInformation) => {
			this.emit("debuggableAppFound", debuggableAppInfo);
		});

		device.applicationManager.on("debuggableAppLost", (debuggableAppInfo: Mobile.IDeviceApplicationInformation) => {
			this.emit("debuggableAppLost", debuggableAppInfo);
		});

		device.applicationManager.on("debuggableViewFound", (appIdentifier: string, debuggableWebViewInfo: Mobile.IDebugWebViewInfo) => {
			this.emit("debuggableViewFound", device.deviceInfo.identifier, appIdentifier, debuggableWebViewInfo);
		});

		device.applicationManager.on("debuggableViewLost", (appIdentifier: string, debuggableWebViewInfo: Mobile.IDebugWebViewInfo) => {
			this.emit("debuggableViewLost", device.deviceInfo.identifier, appIdentifier, debuggableWebViewInfo);
		});

		device.applicationManager.on("debuggableViewChanged", (appIdentifier: string, debuggableWebViewInfo: Mobile.IDebugWebViewInfo) => {
			this.emit("debuggableViewChanged", device.deviceInfo.identifier, appIdentifier, debuggableWebViewInfo);
		});
	}
}
$injector.register("deviceEmitter", DeviceEmitter);
