import { Service, PlatformAccessory } from 'homebridge';
import { EcowittHomebridgePlatform } from './platform';
import { EcowittPlatformAccessory } from './platformAccessory';

export class WH57Accessory extends EcowittPlatformAccessory {
  protected battery: Service;
  protected lightningSensor: Service;
  protected lightningDistance: Service;
  protected lightningCount: Service;

  constructor(
    protected readonly platform: EcowittHomebridgePlatform,
    protected readonly accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    this.lightningDistance = this.accessory.getService(this.platform.Service.OccupancySensor)
      || this.accessory.addService(this.platform.Service.OccupancySensor);

    this.lightningCount = this.accessory.getService(this.platform.Service.MotionSensor)
      || this.accessory.addService(this.platform.Service.MotionSensor);

    this.lightningSensor = this.accessory.getService(this.platform.Service.ContactSensor)
      || this.accessory.addService(this.platform.Service.ContactSensor);

    this.battery = this.addBattery('⚡Battery');
  }

  update(dataReport) {
    this.platform.log.info('WH57 Update');
    this.platform.log.info('  wh57batt:', dataReport.wh57batt);
    this.platform.log.info('  lightning:', dataReport.lightning);
    this.platform.log.info('  lightning_num:', dataReport.lightning_num);
    this.platform.log.info('  lightning_time:', dataReport.lightning_time);

    // Battery

    const batteryLevel = parseFloat(dataReport.wh57batt) / 5;
    const lowBattery = batteryLevel <= 0.2
      ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

    this.battery.updateCharacteristic(
      this.platform.Characteristic.StatusLowBattery,
      lowBattery);

    this.battery.updateCharacteristic(
      this.platform.Characteristic.BatteryLevel,
      batteryLevel * 100);

    // Detection time

    const lightningTime = parseInt(dataReport.lightning_time);
    const lightningDetected = lightningTime > 0 && lightningTime < 300000; // < 5 min

    this.lightningSensor.updateCharacteristic(
      this.platform.Characteristic.ContactSensorState,
      !lightningDetected
        ? this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED
        : this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);

    this.lightningSensor.updateCharacteristic(
      this.platform.Characteristic.StatusLowBattery,
      lowBattery);

    let contactText = '⚡';

    if (lightningTime > 0) {
      const ms = lightningTime;
      let s = Math.floor(ms / 1000);
      let m = Math.floor(s / 60);
      s = s % 60;
      let h = Math.floor(m / 60);
      m = m % 60;
      const d = Math.floor(h / 24);
      h = h % 24;

      // eslint-disable-next-line no-inner-declarations
      function append(t: string) {
        if (contactText) {
          contactText += ',';
        }

        contactText += t;
      }

      if (d > 1) {
        append(d.toString() + ' days');
      } else if (d || h || m) {
        if (d) {
          append(d > 1 ? d.toString() + ' days' : '1 day');
        }
        if (h) {
          append(h > 1 ? h.toString() + ' hours' : '1 hour');
        }
        if (m && !d) {
          append(m > 1 ? m.toString() + ' minutes' : '1 minute');
        }
      } else if (s) {
        append(m > 1 ? m.toString() + ' seconds' : '1 second');
      }

      contactText += ' ago';
    }

    this.lightningSensor.updateCharacteristic(
      this.platform.Characteristic.Name,
      contactText);

    // Distance to lightning

    this.lightningDistance.updateCharacteristic(
      this.platform.Characteristic.Name,
      `⚡Distance: ${dataReport.lightning} km`);

    this.lightningDistance.updateCharacteristic(
      this.platform.Characteristic.OccupancyDetected,
      lightningDetected);

    this.lightningDistance.updateCharacteristic(
      this.platform.Characteristic.StatusLowBattery,
      lowBattery);

    // Number of lightning strikes

    this.lightningCount.updateCharacteristic(
      this.platform.Characteristic.MotionDetected,
      lightningDetected);

    this.lightningCount.updateCharacteristic(
      this.platform.Characteristic.StatusLowBattery,
      lowBattery);

    this.lightningCount.updateCharacteristic(
      this.platform.Characteristic.Name,
      `⚡Strikes: ${dataReport.lightning_num}`);
  }
}