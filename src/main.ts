import "phaser";
import MainScene from "./scenes/main";
import UIScene from "./scenes/UIScene";

const config = {
  type: Phaser.AUTO,
  backgroundColor: "#18647c", // Ocean blue background
  scale: {
    parent: "game",
    mode: Phaser.Scale.FIT,
    width: window.innerWidth * window.devicePixelRatio,
    height: window.innerHeight * window.devicePixelRatio,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainScene, UIScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 }, // Explicitly add x: 0
    },
  },
  dom: {
    createContainer: true,
  },
};

window.addEventListener("load", () => {
  new Phaser.Game(config);
});
