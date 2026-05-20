const KEY =
  'favorite_stations';

export function getFavorites(): string[] {

  const raw =
    localStorage.getItem(KEY);

  if (!raw) {
    return [];
  }

  try {

    return JSON.parse(raw);

  } catch {

    return [];
  }
}

export function isFavorite(
  stationId: string
) {

  return getFavorites().includes(
    stationId
  );
}

export function toggleFavorite(
  stationId: string
) {

  const favorites =
    getFavorites();

  let updated: string[];

  if (
    favorites.includes(
      stationId
    )
  ) {

    updated =
      favorites.filter(
        (id) =>
          id !== stationId
      );

  } else {

    updated = [
      ...favorites,
      stationId,
    ];
  }

  localStorage.setItem(
    KEY,
    JSON.stringify(updated)
  );

  return updated;
}