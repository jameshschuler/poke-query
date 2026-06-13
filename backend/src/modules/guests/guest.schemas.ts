import { Type } from "@fastify/type-provider-typebox";

export const GuestSessionSchema = {
  response: {
    200: Type.Object({
      guestId: Type.String(),
      favoritesCount: Type.Integer(),
      maxFavorites: Type.Integer(),
    }),
  },
};

export const GetGuestFavoritesSchema = {
  response: {
    200: Type.Object({
      favoriteQueryIds: Type.Array(Type.String()),
      favoritesCount: Type.Integer(),
      maxFavorites: Type.Integer(),
    }),
  },
};

export const FavoriteGuestQuerySchema = {
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    204: Type.Null(),
    404: Type.Object({
      error: Type.String(),
    }),
    409: Type.Object({
      error: Type.String(),
      maxFavorites: Type.Integer(),
    }),
  },
};

export const UnfavoriteGuestQuerySchema = {
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    204: Type.Null(),
  },
};
