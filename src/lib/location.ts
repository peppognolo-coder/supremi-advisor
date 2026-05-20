export interface UserLocation {

  lat: number;

  lng: number;
}

export function getCurrentLocation():

Promise<UserLocation> {

  return new Promise(
    (resolve, reject) => {

      if (
        !navigator.geolocation
      ) {

        reject(
          new Error(
            'Geolocalizzazione non supportata'
          )
        );

        return;
      }

      navigator.geolocation.getCurrentPosition(

        (position) => {

          resolve({

            lat:
              position.coords.latitude,

            lng:
              position.coords.longitude,
          });
        },

        (error) => {

          reject(error);
        },

        {
          enableHighAccuracy: true,
        }
      );
    }
  );
}

export function calculateDistance(

  lat1: number,
  lng1: number,

  lat2: number,
  lng2: number
) {

  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) /
    180;

  const dLng =
    ((lng2 - lng1) * Math.PI) /
    180;

  const a =

    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +

    Math.cos(
      (lat1 * Math.PI) / 180
    ) *

      Math.cos(
        (lat2 * Math.PI) / 180
      ) *

      Math.sin(dLng / 2) *

      Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}