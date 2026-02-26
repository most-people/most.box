import { createThirdwebClient } from "thirdweb";

//  Thirdweb Client ID https://thirdweb.com/dashboard/settings/api-keys
const clientId = "35e78b1757357d0969058cfe8bb24e36";

export const client = createThirdwebClient({
  clientId,
});
