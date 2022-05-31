import { parseMessage } from "./parser.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const signInBtn = document.querySelector("#sign-in");
const accessToken = sessionStorage.getItem("accessToken");

function colorStringToRGB(colorString) {
  switch (colorString) {
    case "red":
      return [255, 0, 0];
    case "orange":
      return [244, 88, 0];
    case "yellow":
      return [255, 159, 0];
    case "green":
      return [0, 255, 0];
    case "turquoise":
      return [0, 255, 255];
    case "blue":
      return [0, 0, 255];
    case "purple":
      return [101, 3, 154];
    case "black":
      return [0, 0, 0];
    case "pink":
      return [248, 24, 148];
    default:
      return null;
  }
}


if (accessToken) {
  const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

  ws.addEventListener("open", () => {
    ws.send("CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands");
    ws.send(`PASS oauth:${sessionStorage.getItem("accessToken")}`);
    ws.send("NICK lightsbot");

    ws.send("JOIN #bunnygirlzenpai");
  });

  ws.addEventListener("message", (e) => {
    const parsed = parseMessage(e.data);
    if (parsed === null) {
      return;
    }

    console.log(parsed);

    // Twitch server PINGs us every 5 mins or so to check if we're alive
    // If we don't respond with PONG it'll kick us
    if (parsed.command && parsed.command.command === "PING") {
      ws.send(`PONG :${parsed.parameters}`);
    }

    let color = null;
    if (
      parsed.tags &&
      parsed.tags["custom-reward-id"] &&
      parsed.tags["custom-reward-id"] === "9f524bb9-a5ea-42c2-9c0d-bb7ea260b6a4"
    ) {
      color = parsed.parameters.trim().toLowerCase();
    } else if (
      parsed.source &&
      parsed.source.host === "bunnygirlzenpai@bunnygirlzenpai.tmi.twitch.tv" &&
      parsed.command.botCommand
    ) {
      color = parsed.command.botCommand;
    }

    if (color !== null) {
      const rgb = colorStringToRGB(color);
      if (rgb === null) {
        setTimeout(() => {
          ws.send("PRIVMSG #bunnygirlzenpai :Invalid color!");
        }, 1000);
      } else {
        console.log("flash: ", color);
        fetch(`https://192.168.0.193:5000/solid?rgb=${rgb.join(":")}`);
      }
    }
  });
} else {
  signInBtn.style.visibility = "visible";

  signInBtn.addEventListener("click", () => {
    window.location = [
      "https://id.twitch.tv/oauth2/authorize",
      `?response_type=token`,
      `&client_id=t9engz4h3xp5mzviv6vyrr90jw19rm`,
      `&redirect_uri=https://192.168.0.193:5000`,
      `&scope=chat%3Aread+chat%3Aedit`,
      `&state=c3ab8aa609ea11e793ae92361f002671`,
    ].join("");
  });

  if (window.location.hash.startsWith("#access_token")) {
    console.log("signing in...");
    console.log(window.location.hash);
    const accessToken = window.location.hash
      .split("&")[0]
      .slice("#access_token=".length);
    console.log(accessToken);
    sessionStorage.setItem("accessToken", accessToken);
    window.location = "/";
  }
}
