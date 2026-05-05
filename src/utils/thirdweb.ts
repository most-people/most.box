import { createThirdwebClient } from "thirdweb";
import { THIRDWEB_CLIENT_ID } from "@/constants";

//  Thirdweb Client ID https://thirdweb.com/dashboard/settings/api-keys
const clientId = THIRDWEB_CLIENT_ID;

export const client = createThirdwebClient({
  clientId,
});
