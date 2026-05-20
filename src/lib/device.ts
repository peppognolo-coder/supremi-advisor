const DEVICE_KEY =
  'trenord_device_id';

export function getDeviceId() {

  let deviceId =
    localStorage.getItem(
      DEVICE_KEY
    );

  if (!deviceId) {

    deviceId =
      crypto.randomUUID();

    localStorage.setItem(
      DEVICE_KEY,
      deviceId
    );
  }

  return deviceId;
}