import MMBot from "./src/MMBot"
import { getMMWallet, getWsProvider } from "./src/utils/Ether"

(async () => {
  const MMWallet = await getMMWallet();
  const Provider = await getWsProvider();
  const Bot = new MMBot(MMWallet, Provider);
  await Bot.initBalance();
  await Bot.initEventListener();
  await Bot.start();
})();