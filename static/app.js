import { parseMessage } from "./parser.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const signInBtn = document.querySelector("#sign-in");
const accessToken = sessionStorage.getItem("accessToken");

function colorStringToRGB(colorString) {
  if (colorString.includes("red")){
    return [255, 0, 0];
  } else if (colorString.includes("orange")){
    return [160, 19, 3];
  }else if (colorString.includes("yellow")){
    return [199, 192, 0];
  }else if (colorString.includes("green")){
    return [0, 255, 0];
  }else if (colorString.includes("turquoise")){
    return [0, 255, 255];
  }else if (colorString.includes("blue")){
    return [0, 0, 255];
  }else if (colorString.includes("purple")){
    return [38, 0, 56];
  }else if (colorString.includes("pink")){
    return [158, 0, 124];
  }else{
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
      parsed.tags["custom-reward-id"] === "858972d4-9bc7-484e-b2ad-2d3f2e92c683"
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
        fetch(`https://192.168.0.193:5001/wipe?rgb=${rgb.join(":")}`);
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
      `&redirect_uri=https://192.168.0.193:5001`,
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

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

const animeationSelect = document.getElementById("animation-type");
const colorInput = document.getElementById("color-input");

animeationSelect.addEventListener("change", (e) => {
  switch (animeationSelect.value) {
    case "solid": {
      const rgbArr = hexToRgb(colorInput.value);
      fetch(`https://192.168.0.193:5001/solid?rgb=${rgbArr.join(":")}`);
      break;
    }
    case "rainbow":
      fetch(`https://192.168.0.193:5001/rainbow`);
      break;
    case "matrix": {
      const rgbArr = hexToRgb(colorInput.value);
      fetch(`https://192.168.0.193:5001/matrix?rgb=${rgbArr.join(":")}`);
      break;
    }
    case "love":
      fetch(`https://192.168.0.193:5001/matrix?rgb=255:0:0`);
      break;
    case "rain":
      fetch(`https://192.168.0.193:5001/matrix?rgb=0:0:255`);
      break;
  }

});

colorInput.addEventListener("input", (e) => {
  const rgbArr = hexToRgb(e.target.value);
  switch (animeationSelect.value) {
    case "solid": {
      fetch(`https://192.168.0.193:5001/solid?rgb=${rgbArr.join(":")}`);
      break;
    }
    case "matrix": {
      fetch(`https://192.168.0.193:5001/matrix?rgb=${rgbArr.join(":")}`);
      break;
    }
    case "rainbow":
    case "love":
    case "rain":
      break;
  }
});

