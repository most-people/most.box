import ky from "ky";

export const apiKy = ky.create({
  timeout: false,
});
