import "phaser";

type CarriedTileInfo = {
  x: number;
  y: number;
  index: number;
  layer: Phaser.Tilemaps.TilemapLayer;
  tileset: Phaser.Tilemaps.Tileset;

  relativeOffsetX?: number;
  relativeOffsetY?: number;
};

export default class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private player!: Phaser.GameObjects.Sprite;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
  };
  private currentDir: string = "down";
  private isCarrying: boolean = false;
  private isPerformingAction: boolean = false;

  private carriedItemPart1Sprite: Phaser.GameObjects.Sprite | null = null;
  private carriedItemPart2Sprite: Phaser.GameObjects.Sprite | null = null;
  private carriedItemOriginalTile1: CarriedTileInfo | null = null;
  private carriedItemOriginalTile2: CarriedTileInfo | null = null;

  private readonly walkSpeed = 100;
  private readonly runSpeed = 200;
  private readonly baseFrameRate = 10;
  private readonly actionFrameRate = this.baseFrameRate * 1.2;

  private grassLayer!: Phaser.Tilemaps.TilemapLayer;
  private soilLayer!: Phaser.Tilemaps.TilemapLayer;

  private activeGlows: {
    graphics: Phaser.GameObjects.Graphics;
    x: number;
    y: number;
    tween: Phaser.Tweens.Tween | null;
  }[] = [];

  private readonly SOIL_BASE = 148;
  private readonly SOIL_BORDER_UP = 123;
  private readonly SOIL_BORDER_DOWN = 173;
  private readonly SOIL_BORDER_LEFT = 147;
  private readonly SOIL_BORDER_RIGHT = 149;
  private readonly SOIL_LR = 164;
  private readonly SOIL_UD = 165;
  private readonly SOIL_LRD = 189;
  private readonly SOIL_UDL = 190;
  private readonly SOIL_LRU = 214;
  private readonly SOIL_UDR = 215;
  private readonly SOIL_ALL = 239;
  private readonly SOIL_CORNER_UL = 264;
  private readonly SOIL_CORNER_UR = 265;
  private readonly SOIL_CORNER_DL = 266;
  private readonly SOIL_CORNER_DR = 267;

  private readonly COLLISION_CHECK_LAYERS = [
    "Tile Layer -2",
    "Tile Layer -1",
    "Tile Layer 0",
    "Tile Layer 1",
    "Tile Layer 2",
    "Tile Layer 3",
    "Tile Layer 4",
    "Tile Layer 5",
  ];

  constructor() {
    super("main");
  }

  preload() {
    this.load.tilemapTiledJSON("map", "mapCopy.tmj");

    this.load.image(
      "Dungeon_Tiles",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Dungeon_Tiles.png"
    );
    this.load.image(
      "Floors_Tiles",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Floors_Tiles.png"
    );
    this.load.image(
      "Wall_Tiles",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Wall_Tiles.png"
    );
    this.load.image(
      "Wall_Variations",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Wall_Variations.png"
    );
    this.load.image(
      "Water_tiles",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Water_tiles.png"
    );

    this.load.image(
      "Vegetation",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Vegetation.png"
    );
    this.load.image(
      "Props",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Props.png"
    );
    this.load.image(
      "Roofs",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Roofs.png"
    );
    this.load.image(
      "Walls",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Walls.png"
    );
    this.load.image(
      "Size_02",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/Size_02.png"
    );
    this.load.image(
      "Size_03",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/Size_03.png"
    );
    this.load.image(
      "Size_04",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/Size_04.png"
    );
    this.load.image(
      "Size_05",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/Size_05.png"
    );
    this.load.image(
      "Furniture",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Furniture.png"
    );
    this.load.image(
      "Rocks",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Rocks.png"
    );
    this.load.image(
      "Shadows",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Shadows.png"
    );
    this.load.image(
      "Shadows1",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Shadows1.png"
    );
    this.load.image(
      "Level_1",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_1.png"
    );

    this.load.spritesheet(
      "Farm",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Farm.png",
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet(
      "Level_2-Sheet",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_2-Sheet.png",
      { frameWidth: 80, frameHeight: 64 }
    );
    this.load.spritesheet(
      "Level_3-Sheet",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_3-Sheet.png",
      { frameWidth: 112, frameHeight: 80 }
    );

    const frameConfig = { frameWidth: 64, frameHeight: 64 };
    const animPrefixes = [
      "idle",
      "walk",
      "run",
      "hit",
      "carry_idle",
      "carry_walk",
      "carry_run",
      "collect",
      "crush",
      "pierce",
      "slice",
      "watering",
      "fishing",
    ];
    const animDirections = ["down", "up", "side"];

    animPrefixes.forEach((prefix) => {
      animDirections.forEach((dir) => {
        const key = `${prefix}_${dir}`;
        let pathSuffix =
          dir === "up" && prefix === "pierce"
            ? "Top"
            : dir.charAt(0).toUpperCase() + dir.slice(1);
        if (dir === "side" && prefix === "pierce") pathSuffix = "Side";
        const isCarryAnim = prefix.startsWith("carry");
        const baseFolderName =
          prefix
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
            .replace(/ /g, "_") + (isCarryAnim ? "" : "_Base");
        const filenamePrefix = prefix
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
          .replace(/ /g, "_");
        const fullPath = `Animations/${baseFolderName}/${filenamePrefix}_${pathSuffix}-Sheet.png`;
        this.load.spritesheet(key, fullPath, frameConfig);
      });
    });
  }

  create() {
    this.map = this.make.tilemap({ key: "map" });

    const tilesets = this.loadTilesets();
    this.createLayers(tilesets);
    this.initializePlayer();
    this.createAnimations();
    this.setupInput();
    this.setupCamera();
    this.initializeLayerReferences(tilesets);
  }

  private loadTilesets(): Phaser.Tilemaps.Tileset[] {
    const tilesets: Phaser.Tilemaps.Tileset[] = [];
    this.map.tilesets.forEach((mapTileset) => {
      const tileset = this.map.addTilesetImage(
        mapTileset.name,
        mapTileset.name
      );
      if (tileset) {
        tilesets.push(tileset);
        console.log(`Successfully loaded tileset: ${mapTileset.name}`);
      } else {
        console.error(`Failed to load tileset: ${mapTileset.name}`);
      }
    });
    return tilesets;
  }

  private createLayers(tilesets: Phaser.Tilemaps.Tileset[]): void {
    const layerDepthMap: { [key: string]: number } = {
      "-2": -2,
      "-1": -1,
      "0": 0,
      "1": 1,
      "2": 2,
      "4": 4,
      "5": 5,
    };

    console.log("Creating layers:");
    this.map.layers.forEach((layerData) => {
      try {
        console.log(`Attempting to create layer: ${layerData.name}`);
        const createdLayer = this.map.createLayer(
          layerData.name,
          tilesets,
          0,
          0
        );
        if (createdLayer) {
          console.log(
            `Successfully created layer: ${layerData.name}, Visible (from Tiled): ${layerData.visible}`
          );

          // Set depth based on name suffix - Default to 0 if no match
          let depthSet = false;
          for (const suffix in layerDepthMap) {
            // Check if name *ends with* the suffix (e.g., "Tile Layer 0", "Objects 5")
            if (
              layerData.name.endsWith(` ${suffix}`) ||
              layerData.name === `Tile Layer ${suffix}`
            ) {
              createdLayer.setDepth(layerDepthMap[suffix]);
              console.log(
                ` -> Set depth to ${layerDepthMap[suffix]} based on suffix '${suffix}'`
              );
              depthSet = true;
              break;
            }
          }
          if (!depthSet) {
            createdLayer.setDepth(0); // Default depth if no suffix matches
            console.log(
              ` -> No matching suffix found, set depth to 0 (default)`
            );
          }

          // Explicitly set visibility based on Tiled data
          createdLayer.setVisible(layerData.visible);
          console.log(` -> Set visibility to ${layerData.visible}`);
        } else {
          console.error(`Failed to create layer object: ${layerData.name}`);
        }
      } catch (error) {
        console.error(`Error creating layer ${layerData.name}:`, error);
      }
    });
  }

  private initializePlayer(): void {
    this.player = this.add.sprite(100, 100, "idle_down");
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(3);
  }

  private createAnimation(
    key: string,
    sheetKey: string,
    endFrame: number,
    frameRate: number,
    repeat: number = -1
  ): void {
    this.anims.create({
      key: key,
      frames: this.anims.generateFrameNumbers(sheetKey, { end: endFrame }),
      frameRate: frameRate,
      repeat: repeat,
    });
  }

  private createAnimations(): void {
    const idleFrameRate = this.baseFrameRate / 2;
    const walkFrameRate = this.baseFrameRate;
    const runFrameRate = this.baseFrameRate * 1.5;
    const actionFrameRate = this.actionFrameRate;

    this.createAnimation("idle_down", "idle_down", 3, idleFrameRate);
    this.createAnimation("idle_up", "idle_up", 3, idleFrameRate);
    this.createAnimation("idle_side", "idle_side", 3, idleFrameRate);

    this.createAnimation("walk_down", "walk_down", 5, walkFrameRate);
    this.createAnimation("walk_up", "walk_up", 5, walkFrameRate);
    this.createAnimation("walk_side", "walk_side", 5, walkFrameRate);

    this.createAnimation("run_down", "run_down", 5, runFrameRate);
    this.createAnimation("run_up", "run_up", 5, runFrameRate);
    this.createAnimation("run_side", "run_side", 5, runFrameRate);

    this.createAnimation("hit_down", "hit_down", 3, actionFrameRate, 0);
    this.createAnimation("hit_up", "hit_up", 3, actionFrameRate, 0);
    this.createAnimation("hit_side", "hit_side", 3, actionFrameRate, 0);

    this.createAnimation(
      "carry_idle_down",
      "carry_idle_down",
      3,
      idleFrameRate
    );
    this.createAnimation("carry_idle_up", "carry_idle_up", 3, idleFrameRate);
    this.createAnimation(
      "carry_idle_side",
      "carry_idle_side",
      3,
      idleFrameRate
    );

    this.createAnimation(
      "carry_walk_down",
      "carry_walk_down",
      5,
      walkFrameRate
    );
    this.createAnimation("carry_walk_up", "carry_walk_up", 5, walkFrameRate);
    this.createAnimation(
      "carry_walk_side",
      "carry_walk_side",
      5,
      walkFrameRate
    );

    this.createAnimation("carry_run_down", "carry_run_down", 5, runFrameRate);
    this.createAnimation("carry_run_up", "carry_run_up", 5, runFrameRate);
    this.createAnimation("carry_run_side", "carry_run_side", 5, runFrameRate);

    const actionAnims = [
      "collect",
      "crush",
      "pierce",
      "slice",
      "watering",
      "fishing",
    ];
    actionAnims.forEach((prefix) => {
      this.createAnimation(
        `${prefix}_down`,
        `${prefix}_down`,
        7,
        actionFrameRate,
        0
      );
      this.createAnimation(
        `${prefix}_up`,
        `${prefix}_up`,
        7,
        actionFrameRate,
        0
      );
      this.createAnimation(
        `${prefix}_side`,
        `${prefix}_side`,
        7,
        actionFrameRate,
        0
      );
    });

    this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isPerformingAction = false;
      const currentAnim = this.player.anims.currentAnim;
      if (currentAnim && !currentAnim.repeat) {
        const idleAnim = this.getCurrentIdleAnimKey();
        if (this.player.anims.currentAnim?.key !== idleAnim) {
          this.player.anims.play(idleAnim, true);
        }
      }
    });
  }

  private setupInput(): void {
    this.input.keyboard?.createCursorKeys();

    this.keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SHIFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    this.player.anims.play("idle_down", true);
    this.input.on("pointerdown", this.handlePointerDown, this);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.setZoom(3);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  private initializeLayerReferences(tilesets: Phaser.Tilemaps.Tileset[]): void {
    const grassLayer = this.map.getLayer("Tile Layer 0")?.tilemapLayer;
    if (grassLayer) {
      this.grassLayer = grassLayer;
      console.log("Grass layer 'Tile Layer 0' initialized.");
    } else {
      console.error(
        "Failed to find 'Tile Layer 0'. Grass/Soil logic might fail."
      );
    }

    const soilLayer = this.map.getLayer("Tile Layer 1")?.tilemapLayer;
    if (soilLayer) {
      this.soilLayer = soilLayer;
      console.log("Soil layer 'Tile Layer 1' initialized.");
    } else {
      console.warn(
        "Could not find 'Tile Layer 1'. Creating a blank one for soil."
      );
      const newSoilLayer = this.map.createBlankLayer(
        "Tile Layer 1",
        tilesets,
        0,
        0
      );
      if (newSoilLayer) {
        this.soilLayer = newSoilLayer;
        this.soilLayer.setDepth(1);
        console.log("Created a blank 'Tile Layer 1' for soil.");
      } else {
        console.error(
          "Failed to create even a blank 'Tile Layer 1'. Soil placement will fail."
        );
      }
    }
  }

  update(_: number, delta: number): void {
    this.updateCarriedItemPosition();
    this.handlePlayerMovement(delta);
    this.updatePlayerAnimation();
  }

  private updateCarriedItemPosition(): void {
    if (
      !this.isCarrying ||
      !this.carriedItemOriginalTile1 ||
      !this.carriedItemPart1Sprite
    ) {
      return;
    }

    const relOffsetX = this.carriedItemOriginalTile1.relativeOffsetX ?? 0;
    const relOffsetY = this.carriedItemOriginalTile1.relativeOffsetY ?? -1;
    const baseOffsetX = 0;
    const baseOffsetY = -24;

    const magnitude =
      Math.sqrt(relOffsetX * relOffsetX + relOffsetY * relOffsetY) || 1;
    const normX = relOffsetX / magnitude;
    const normY = relOffsetY / magnitude;

    const worldOffsetX = normX * (this.map.tileWidth / 2);
    const worldOffsetY = normY * (this.map.tileHeight / 2);

    this.carriedItemPart1Sprite.setPosition(
      this.player.x + baseOffsetX - worldOffsetX,
      this.player.y + baseOffsetY - worldOffsetY
    );

    if (this.carriedItemPart2Sprite) {
      this.carriedItemPart2Sprite.setPosition(
        this.player.x + baseOffsetX + worldOffsetX,
        this.player.y + baseOffsetY + worldOffsetY
      );
    }
  }

  private handlePlayerMovement(delta: number): void {
    if (this.isPerformingAction) {
      return;
    }

    const isMovingW = this.keys.W.isDown;
    const isMovingA = this.keys.A.isDown;
    const isMovingS = this.keys.S.isDown;
    const isMovingD = this.keys.D.isDown;
    const isRunning = this.keys.SHIFT.isDown;
    const isActivelyMoving = isMovingW || isMovingA || isMovingS || isMovingD;

    let moveX = 0;
    let moveY = 0;
    const currentSpeed = isRunning ? this.runSpeed : this.walkSpeed;

    if (isActivelyMoving) {
      if (isMovingW) {
        this.currentDir = "up";
        moveY = -currentSpeed;
      } else if (isMovingS) {
        this.currentDir = "down";
        moveY = currentSpeed;
      }

      if (isMovingA) {
        this.currentDir = "left";
        moveX = -currentSpeed;
        if (isMovingW || isMovingS) moveY = 0;
      } else if (isMovingD) {
        this.currentDir = "right";
        moveX = currentSpeed;
        if (isMovingW || isMovingS) moveY = 0;
      }
    }

    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
    if (magnitude > currentSpeed) {
      moveX = (moveX / magnitude) * currentSpeed;
      moveY = (moveY / magnitude) * currentSpeed;
    }

    const deltaFactor = delta / 1000;
    const newX = this.player.x + moveX * deltaFactor;
    const newY = this.player.y + moveY * deltaFactor;

    const canMoveX = !this.hasCollisionAtWorldXY(newX, this.player.y);
    const canMoveY = !this.hasCollisionAtWorldXY(this.player.x, newY);

    if (canMoveX) {
      this.player.x = newX;
    }
    if (canMoveY) {
      this.player.y = newY;
    }
  }

  private updatePlayerAnimation(): void {
    if (this.isPerformingAction) {
      return;
    }

    const isMovingW = this.keys.W.isDown;
    const isMovingA = this.keys.A.isDown;
    const isMovingS = this.keys.S.isDown;
    const isMovingD = this.keys.D.isDown;
    const isRunning = this.keys.SHIFT.isDown;
    const isActivelyMoving = isMovingW || isMovingA || isMovingS || isMovingD;

    let newAnimKey = "";
    let flipX = this.player.flipX;

    const basePrefix = this.isCarrying ? "carry_" : "";

    if (isActivelyMoving) {
      const movePrefix = isRunning ? `${basePrefix}run_` : `${basePrefix}walk_`;
      switch (this.currentDir) {
        case "up":
          newAnimKey = `${movePrefix}up`;
          break;
        case "down":
          newAnimKey = `${movePrefix}down`;
          break;
        case "left":
          newAnimKey = `${movePrefix}side`;
          flipX = true;
          break;
        case "right":
          newAnimKey = `${movePrefix}side`;
          flipX = false;
          break;
      }
    } else {
      newAnimKey = this.getCurrentIdleAnimKey();
      flipX = this.currentDir === "left";
    }

    this.player.setFlipX(flipX);

    if (
      newAnimKey &&
      (this.player.anims.currentAnim?.key !== newAnimKey ||
        !this.player.anims.isPlaying)
    ) {
      this.player.anims.play(newAnimKey, true);
    }
  }

  private getCurrentIdleAnimKey(): string {
    const basePrefix = this.isCarrying ? "carry_idle_" : "idle_";
    const directionSuffix =
      this.currentDir === "up" || this.currentDir === "down"
        ? this.currentDir
        : "side";
    return `${basePrefix}${directionSuffix}`;
  }

  private getPlayerTileCoords(): { x: number | null; y: number | null } {
    const x = this.map.worldToTileX(this.player.x);
    const y = this.map.worldToTileY(this.player.y);
    return { x, y };
  }

  private getAdjacentTileCoords(
    baseX: number,
    baseY: number
  ): { x: number; y: number }[] {
    return [
      { x: baseX, y: baseY - 1 },
      { x: baseX, y: baseY + 1 },
      { x: baseX - 1, y: baseY },
      { x: baseX + 1, y: baseY },
    ];
  }

  private findAdjacentTileWithProperty(
    baseX: number,
    baseY: number,
    propertyName: string,
    propertyValue: any = true
  ): Phaser.Tilemaps.Tile | null {
    const adjacentCoords = this.getAdjacentTileCoords(baseX, baseY);

    for (const coord of adjacentCoords) {
      for (const layerName of this.COLLISION_CHECK_LAYERS) {
        const layer = this.map.getLayer(layerName)?.tilemapLayer;
        if (layer) {
          const tile = layer.getTileAt(coord.x, coord.y);
          if (tile?.properties?.[propertyName] === propertyValue) {
            return tile;
          }
        }
      }
    }
    return null;
  }

  private hasCollisionAtWorldXY(worldX: number, worldY: number): boolean {
    const tileX = this.map.worldToTileX(worldX);
    const tileY = this.map.worldToTileY(worldY);

    if (tileX === null || tileY === null) {
      // Coordinates are outside the map, treat as non-colliding or handle as needed
      // console.warn(`Collision check outside map bounds: ${worldX}, ${worldY}`);
      return false; // Or true, depending on desired behavior for off-map checks
    }

    for (const layerName of this.COLLISION_CHECK_LAYERS) {
      const layer = this.map.getLayer(layerName)?.tilemapLayer;
      if (layer?.visible) {
        const tile = layer.getTileAt(tileX, tileY);
        if (tile?.properties?.collision === true) {
          return true; // Space has a collision marker on some layer
        }
      }
    }
    return false;
  }

  private handlePointerDown() {
    if (this.isPerformingAction) return;

    if (this.isCarrying) {
      this.putDownTwoPartItem();
      return;
    }

    const { x: playerTileX, y: playerTileY } = this.getPlayerTileCoords();
    if (playerTileX === null || playerTileY === null) return;

    if (this.tryStumpInteraction(playerTileX, playerTileY)) return;
    if (this.tryWaterInteraction(playerTileX, playerTileY)) return;
    if (this.tryPickupInteraction(playerTileX, playerTileY)) return;
    if (this.tryGrassRemovalInteraction(playerTileX, playerTileY)) return;
    if (this.trySoilPlacementInteraction(playerTileX, playerTileY)) return;
  }

  private tryStumpInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    const adjacentStump = this.findAdjacentTileWithProperty(
      playerTileX,
      playerTileY,
      "stump"
    );
    if (adjacentStump) {
      this.performAction("slice", () => this.cutTree(adjacentStump));
      return true;
    }
    return false;
  }

  private tryWaterInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    const adjacentWater = this.findAdjacentTileWithProperty(
      playerTileX,
      playerTileY,
      "water"
    );
    if (adjacentWater) {
      this.performAction("fishing");
      return true;
    }
    return false;
  }

  private tryPickupInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    let tile1: Phaser.Tilemaps.Tile | null = null;
    let tile2: Phaser.Tilemaps.Tile | null = null;

    for (const layerName of this.COLLISION_CHECK_LAYERS) {
      const layer = this.map.getLayer(layerName)?.tilemapLayer;
      if (!layer) continue;

      const tileUnderPlayer = layer.getTileAt(playerTileX, playerTileY);

      if (tileUnderPlayer?.properties?.canPickup1_2 === true) {
        const potentialPartner = layer.getTileAt(playerTileX, playerTileY - 1);
        if (potentialPartner?.properties?.canPickup2_2 === true) {
          tile1 = tileUnderPlayer;
          tile2 = potentialPartner;
          break;
        }
      } else if (tileUnderPlayer?.properties?.canPickup2_2 === true) {
        const potentialPartner = layer.getTileAt(playerTileX, playerTileY + 1);
        if (potentialPartner?.properties?.canPickup1_2 === true) {
          tile1 = potentialPartner;
          tile2 = tileUnderPlayer;
          break;
        }
      }
    }

    if (tile1 && tile2) {
      this.pickupTwoPartItem(tile1, tile2);
      return true;
    }
    return false;
  }

  private tryGrassRemovalInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    if (this.grassLayer?.getTileAt(playerTileX, playerTileY)) {
      this.performAction("crush", () => {
        this.grassLayer.removeTileAt(playerTileX, playerTileY);
        this.updateGrassBorders(playerTileX, playerTileY);
      });
      return true;
    }
    return false;
  }

  private trySoilPlacementInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    if (this.canPlaceSoil(playerTileX, playerTileY)) {
      this.performAction("crush", () =>
        this.placeSoilTile(playerTileX, playerTileY)
      );
      return true;
    }
    return false;
  }

  private performAction(
    actionAnimPrefix: string,
    onComplete?: () => void
  ): void {
    if (this.isPerformingAction) return;

    this.isPerformingAction = true;

    const directionSuffix =
      this.currentDir === "up" || this.currentDir === "down"
        ? this.currentDir
        : "side";
    const actionAnimKey = `${actionAnimPrefix}_${directionSuffix}`;
    const flipX = this.currentDir === "left";

    this.player.setFlipX(flipX);

    this.player.anims.play(actionAnimKey, true);

    if (onComplete) {
      onComplete();
    }
  }

  private pickupTwoPartItem(
    tile1: Phaser.Tilemaps.Tile,
    tile2: Phaser.Tilemaps.Tile
  ): void {
    if (
      !tile1.tilemapLayer ||
      !tile2.tilemapLayer ||
      !tile1.tileset ||
      !tile2.tileset
    ) {
      console.error("Cannot pick up item: Tile layer or tileset missing.");
      return;
    }

    this.isCarrying = true;

    const relOffsetX = tile2.x - tile1.x;
    const relOffsetY = tile2.y - tile1.y;

    this.carriedItemOriginalTile1 = {
      x: tile1.x,
      y: tile1.y,
      index: tile1.index,
      layer: tile1.tilemapLayer,
      tileset: tile1.tileset,
      relativeOffsetX: relOffsetX,
      relativeOffsetY: relOffsetY,
    };
    this.carriedItemOriginalTile2 = {
      x: tile2.x,
      y: tile2.y,
      index: tile2.index,
      layer: tile2.tilemapLayer,
      tileset: tile2.tileset,
    };

    tile1.tilemapLayer.removeTileAt(tile1.x, tile1.y);
    tile2.tilemapLayer.removeTileAt(tile2.x, tile2.y);

    const tilesetKey1 = tile1.tileset.name;
    const frameIndex1 = tile1.index - tile1.tileset.firstgid;
    const tilesetKey2 = tile2.tileset.name;
    const frameIndex2 = tile2.index - tile2.tileset.firstgid;

    this.carriedItemPart1Sprite = this.add.sprite(
      this.player.x,
      this.player.y,
      tilesetKey1,
      frameIndex1
    );
    this.carriedItemPart2Sprite = this.add.sprite(
      this.player.x,
      this.player.y,
      tilesetKey2,
      frameIndex2
    );

    const carriedItemDepth = this.player.depth + 1;
    this.carriedItemPart1Sprite.setDepth(carriedItemDepth);
    this.carriedItemPart2Sprite.setDepth(carriedItemDepth);

    this.player.anims.play(this.getCurrentIdleAnimKey(), true);
    this.updateCarriedItemPosition();
  }

  private putDownTwoPartItem() {
    if (!this.carriedItemOriginalTile1 || !this.carriedItemOriginalTile2) {
      console.warn("Attempted to put down item, but no item data stored.");
      this.resetCarriedState();
      return;
    }

    const { x: playerTileX, y: playerTileY } = this.getPlayerTileCoords();
    if (playerTileX === null || playerTileY === null) {
      console.warn("Cannot place item: Invalid player tile coordinates.");
      return;
    }

    let dropTileX1 = playerTileX;
    let dropTileY1 = playerTileY;

    switch (this.currentDir) {
      case "up":
        dropTileY1--;
        break;
      case "down":
        dropTileY1++;
        break;
      case "left":
        dropTileX1--;
        break;
      case "right":
        dropTileX1++;
        break;
    }

    const relOffsetX = this.carriedItemOriginalTile1.relativeOffsetX ?? 0;
    const relOffsetY = this.carriedItemOriginalTile1.relativeOffsetY ?? -1;
    const dropTileX2 = dropTileX1 + relOffsetX;
    const dropTileY2 = dropTileY1 + relOffsetY;

    const targetLayer = this.carriedItemOriginalTile1.layer;

    const canPlaceTile1 = this.canPlaceTileAt(
      targetLayer,
      dropTileX1,
      dropTileY1
    );
    const canPlaceTile2 = this.canPlaceTileAt(
      targetLayer,
      dropTileX2,
      dropTileY2
    );

    if (!canPlaceTile1 || !canPlaceTile2) {
      console.log("Cannot place item here: Location blocked or invalid.");
      return;
    }

    const newTile1 = targetLayer.putTileAt(
      this.carriedItemOriginalTile1.index,
      dropTileX1,
      dropTileY1
    );
    const newTile2 = targetLayer.putTileAt(
      this.carriedItemOriginalTile2.index,
      dropTileX2,
      dropTileY2
    );

    if (newTile1) {
      if (!newTile1.properties) newTile1.properties = {};
      newTile1.properties.canPickup1_2 = true;
    }
    if (newTile2) {
      if (!newTile2.properties) newTile2.properties = {};
      newTile2.properties.canPickup2_2 = true;
    }

    this.resetCarriedState();
  }

  private canPlaceTileAt(
    layer: Phaser.Tilemaps.TilemapLayer,
    tileX: number,
    tileY: number
  ): boolean {
    if (tileX === null || tileY === null) return false;

    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= layer.width ||
      tileY >= layer.height
    ) {
      return false;
    }

    const existingTile = layer.getTileAt(tileX, tileY);
    if (existingTile) {
      return false;
    }

    const worldX = this.map.tileToWorldX(tileX) + this.map.tileWidth / 2;
    const worldY = this.map.tileToWorldY(tileY) + this.map.tileHeight / 2;
    if (this.hasCollisionAtWorldXY(worldX, worldY)) {
      return false;
    }

    return true;
  }

  private resetCarriedState(): void {
    this.carriedItemPart1Sprite?.destroy();
    this.carriedItemPart2Sprite?.destroy();
    this.carriedItemPart1Sprite = null;
    this.carriedItemPart2Sprite = null;
    this.carriedItemOriginalTile1 = null;
    this.carriedItemOriginalTile2 = null;
    this.isCarrying = false;

    this.player.anims.play(this.getCurrentIdleAnimKey(), true);
  }

  private calculateGrassTileIndex(
    tileX: number,
    tileY: number,
    removedX: number,
    removedY: number
  ): number | null {
    if (!this.grassLayer) return null;

    const isNeighborGrass = (nx: number, ny: number): boolean => {
      if (nx === removedX && ny === removedY) return false;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= this.grassLayer.width ||
        ny >= this.grassLayer.height
      )
        return false;
      return this.grassLayer.getTileAt(nx, ny) !== null;
    };

    let mask = 0;
    if (isNeighborGrass(tileX, tileY - 1)) mask |= 1;
    if (isNeighborGrass(tileX + 1, tileY - 1)) mask |= 2;
    if (isNeighborGrass(tileX + 1, tileY)) mask |= 4;
    if (isNeighborGrass(tileX + 1, tileY + 1)) mask |= 8;
    if (isNeighborGrass(tileX, tileY + 1)) mask |= 16;
    if (isNeighborGrass(tileX - 1, tileY + 1)) mask |= 32;
    if (isNeighborGrass(tileX - 1, tileY)) mask |= 64;
    if (isNeighborGrass(tileX - 1, tileY - 1)) mask |= 128;

    const tileIndexMap_8Way: { [key: number]: number | null } = {
      255: 252,
      254: 102,
      251: 50,
      239: 2,
      191: 54,
      248: 76,
      247: 25,
      225: 26,
      223: 29,
      15: 28,
      127: 79,
      60: 78,
      253: 75,
      112: 76,
      193: 26,
      7: 28,
      28: 78,
      231: 2,
      207: 2,
      252: 102,
      126: 102,
      199: 2,
      124: 102,
      243: 50,
      159: 54,
      249: 50,
      63: 54,
      241: 50,
      31: 54,
      238: 77,
      187: 52,
      62: 78,
      120: 76,
      195: 26,
      143: 28,
      227: 26,
      240: 76,
      30: 78,
      135: 28,
      250: 76,
      175: 28,
      235: 26,
      75: 26,
      190: 78,
      242: 76,
      47: 28,
      188: 78,
      158: 78,
      156: 78,
      233: 26,
      122: 76,
      210: 76,
      107: 26,
      182: 78,
      180: 78,
      203: 26,
      167: 28,
      39: 28,
      114: 76,
      128: 53,
      130: 53,
      170: 53,
      2: 53,
      40: 53,
      160: 53,
      10: 53,
      8: 53,
      32: 53,
      119: 79,
      221: 75,
      215: 3,
      125: 103,
      236: 77,
      230: 77,
      228: 77,
      179: 52,
      42: 53,
      155: 52,
      110: 77,
      206: 77,
      70: 77,
      68: 77,
      78: 77,
      76: 77,
      116: 102,
      69: 2,
      77: 2,
      196: 77,
      81: 50,
      83: 50,
      86: 102,
      84: 102,
      92: 102,
      102: 77,
      192: 82,
      53: 54,
      21: 54,
      237: 2,
      103: 2,
      229: 2,
      197: 2,
      101: 2,
      205: 2,
      89: 50,
      246: 102,
      212: 102,
      118: 102,
      218: 76,
      173: 28,
      71: 2,
      245: 101,
      213: 101,
      95: 103,
      117: 103,
      85: 103,
      99: 26,
      65: 26,
      67: 26,
      97: 26,
      105: 26,
      133: 28,
      208: 76,
      37: 28,
      5: 28,
      88: 76,
      80: 76,
      52: 78,
      20: 78,
      220: 102,
      204: 77,
      198: 77,
      108: 77,
      100: 77,
      162: 53,
      168: 53,
      34: 53,
      138: 53,
      59: 52,
      211: 50,
      151: 54,
      61: 54,
      23: 54,
      27: 52,
      121: 50,
      147: 52,
      25: 52,
      17: 52,
      57: 52,
      29: 54,
      177: 52,
      113: 50,
      49: 52,
      145: 52,
      185: 52,
      189: 54,
      183: 54,
      149: 54,
      91: 50,
      19: 52,
      222: 102,
      111: 2,
      214: 102,
      109: 2,
      136: 53,
      56: 32,
      16: 32,
      3: 56,
      169: 56,
      1: 56,
      24: 32,
      131: 56,
      244: 102,
      96: 82,
      64: 82,
      224: 82,
      12: 57,
      4: 57,
      94: 102,
      14: 57,
      166: 57,
      74: 82,
      6: 57,
      79: 2,
      209: 50,
      181: 54,
      219: 50,
      123: 50,
      164: 57,
      171: 56,
      186: 32,
      174: 57,
      132: 57,
      150: 78,
      234: 82,
      200: 82,
      66: 82,
      194: 82,
      46: 57,
      178: 32,
      146: 32,
      232: 82,
      148: 78,
      104: 82,
      44: 57,
      43: 56,
      9: 56,
      26: 32,
      106: 82,
      58: 32,
      142: 57,
      161: 56,
      144: 32,
      48: 32,
      41: 56,
      72: 82,
      134: 57,
      172: 57,
      163: 56,
      184: 32,
      22: 78,
      98: 82,
      202: 82,
      50: 32,
      11: 56,
      176: 32,
      33: 56,
      226: 82,
      141: 28,
      18: 32,
      38: 57,
      140: 57,
      216: 76,
      13: 28,
      139: 56,
      55: 54,
      129: 56,
      73: 26,
      157: 54,
      165: 28,
      137: 56,
      51: 52,
      154: 32,
      36: 57,
      35: 56,
      45: 28,
      90: 76,
      201: 26,
      82: 76,
      115: 50,
      153: 52,
      217: 50,
      152: 32,
      54: 78,
      0: 53,
    };

    let resultIndex = tileIndexMap_8Way[mask];

    if (resultIndex === undefined) {
      console.warn(
        `Undefined grass tile mask: ${mask} at ${tileX},${tileY}. Defaulting to 252.`
      );
      resultIndex = 252;
    }

    return resultIndex;
  }

  private updateGrassBorders(targetX: number, targetY: number): void {
    const tileset = this.map.getTileset("Floors_Tiles");
    if (!this.grassLayer || !tileset) {
      console.error("Cannot update grass borders: Layer or tileset missing.");
      return;
    }
    const firstGid = tileset.firstgid;

    for (let y = targetY - 1; y <= targetY + 1; y++) {
      for (let x = targetX - 1; x <= targetX + 1; x++) {
        if (x === targetX && y === targetY) continue;

        if (
          x < 0 ||
          y < 0 ||
          x >= this.grassLayer.width ||
          y >= this.grassLayer.height
        )
          continue;

        const currentTile = this.grassLayer.getTileAt(x, y);
        if (currentTile) {
          const localIndex = this.calculateGrassTileIndex(
            x,
            y,
            targetX,
            targetY
          );

          if (localIndex !== null && localIndex >= 0) {
            const globalIndex = firstGid + localIndex;
            if (currentTile.index !== globalIndex) {
              this.grassLayer.putTileAt(globalIndex, x, y);
            }
          } else {
            console.warn(
              `Grass tile at ${x},${y} resulted in null index after neighbor removal. Removing.`
            );
            this.grassLayer.removeTileAt(x, y);
          }
        }
      }
    }
  }

  private findConnectedTiles(
    startX: number,
    startY: number,
    propertyName: string,
    layersToCheck: string[],
    propertyValue: any = true
  ): Phaser.Tilemaps.Tile[] {
    const foundTiles: Phaser.Tilemaps.Tile[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited: Set<string> = new Set();
    const startKey = `${startX},${startY}`;

    let startTile: Phaser.Tilemaps.Tile | null = null;
    for (const layerName of layersToCheck) {
      const layer = this.map.getLayer(layerName)?.tilemapLayer;
      if (layer) {
        const tile = layer.getTileAt(startX, startY);
        if (tile?.properties?.[propertyName] === propertyValue) {
          startTile = tile;
          break;
        }
      }
    }

    if (!startTile) {
      return [];
    }

    visited.add(startKey);
    foundTiles.push(startTile);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const neighbors = this.getAdjacentTileCoords(current.x, current.y);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey);

          let neighborTileToAdd: Phaser.Tilemaps.Tile | null = null;
          for (const layerName of layersToCheck) {
            const layer = this.map.getLayer(layerName)?.tilemapLayer;
            if (layer) {
              const tile = layer.getTileAt(neighbor.x, neighbor.y);
              if (tile?.properties?.[propertyName] === propertyValue) {
                neighborTileToAdd = tile;
                break;
              }
            }
          }

          if (neighborTileToAdd) {
            queue.push(neighbor);
            foundTiles.push(neighborTileToAdd);
          }
        }
      }
    }

    return foundTiles;
  }

  private cutTree(initialStumpTile: Phaser.Tilemaps.Tile): void {
    const stumpTiles = this.findConnectedTiles(
      initialStumpTile.x,
      initialStumpTile.y,
      "stump",
      this.COLLISION_CHECK_LAYERS
    );

    if (stumpTiles.length === 0) {
      console.warn(
        "CutTree called but no connected stump tiles found, including the initial one."
      );
      return;
    }

    const allTreeTiles: Phaser.Tilemaps.Tile[] = [];
    const treeTilesSet: Set<string> = new Set();

    stumpTiles.forEach((stump) => {
      const neighbors = this.getAdjacentTileCoords(stump.x, stump.y);
      neighbors.forEach((neighborCoord) => {
        for (const layerName of this.COLLISION_CHECK_LAYERS) {
          const layer = this.map.getLayer(layerName)?.tilemapLayer;
          const potentialTreeTile = layer?.getTileAt(
            neighborCoord.x,
            neighborCoord.y
          );

          if (potentialTreeTile?.properties?.tree === true) {
            const connectedTreeGroup = this.findConnectedTiles(
              potentialTreeTile.x,
              potentialTreeTile.y,
              "tree",
              this.COLLISION_CHECK_LAYERS
            );

            connectedTreeGroup.forEach((treeTile) => {
              const key = `${treeTile.x},${treeTile.y}`;
              if (!treeTilesSet.has(key)) {
                treeTilesSet.add(key);
                allTreeTiles.push(treeTile);
              }
            });
            break;
          }
        }
      });
    });

    allTreeTiles.forEach((treeTile) => {
      treeTile.setVisible(false);
      if (!treeTile.properties) treeTile.properties = {};
      treeTile.properties.tree = false;
    });

    stumpTiles.forEach((stump) => {
      if (!stump.properties) stump.properties = {};
      stump.properties.cut = true;
    });

    console.log(
      `Tree cut: Removed ${allTreeTiles.length} tree tiles, marked ${stumpTiles.length} stumps.`
    );
  }

  private canPlaceSoil(targetX: number, targetY: number): boolean {
    if (!this.grassLayer || !this.soilLayer) return false;

    if (this.grassLayer.getTileAt(targetX, targetY) !== null) {
      return false;
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.grassLayer.getTileAt(targetX + dx, targetY + dy) !== null) {
          return false;
        }
      }
    }

    const worldX = this.map.tileToWorldX(targetX) + this.map.tileWidth / 2;
    const worldY = this.map.tileToWorldY(targetY) + this.map.tileHeight / 2;
    if (worldX === null || worldY === null) {
      console.warn(
        `Cannot check collision for soil placement: Invalid world coordinates for tile ${targetX}, ${targetY}`
      );
      return false;
    }

    if (this.hasCollisionAtWorldXY(worldX, worldY)) {
      return false;
    }

    return true;
  }

  private placeSoilTile(targetX: number, targetY: number): void {
    const farmTileset = this.map.getTileset("Farm");
    if (!this.soilLayer || !farmTileset) {
      console.error("Cannot place soil: Layer or Farm tileset missing.");
      return;
    }

    const baseSoilIndex = this.SOIL_BASE + farmTileset.firstgid;
    const newTile = this.soilLayer.putTileAt(baseSoilIndex, targetX, targetY);

    if (newTile) {
      const baseTileProps = (farmTileset.tileProperties as any)?.[
        this.SOIL_BASE
      ];
      if (baseTileProps) {
        newTile.properties = { ...baseTileProps };
      } else {
        if (!newTile.properties) newTile.properties = {};
      }
      console.log(
        `Placed soil at ${targetX}, ${targetY}. Properties:`,
        newTile.properties
      );

      if (newTile.properties?.emptyPlot === true) {
        this.addGlowEffect(newTile);
      }
    } else {
      console.error(`Failed to place soil tile at ${targetX}, ${targetY}.`);
      return;
    }

    this.updateAdjacentSoilBorder(targetX, targetY);
    this.updateAdjacentSoilBorder(targetX, targetY - 1);
    this.updateAdjacentSoilBorder(targetX, targetY + 1);
    this.updateAdjacentSoilBorder(targetX - 1, targetY);
    this.updateAdjacentSoilBorder(targetX + 1, targetY);

    this.updateGlowSequence();
  }

  private addGlowEffect(tile: Phaser.Tilemaps.Tile): void {
    const glowColor = 0xcd853f;
    const graphics = this.add.graphics({ x: tile.pixelX, y: tile.pixelY });
    graphics.fillStyle(glowColor, 1);
    graphics.fillRect(0, 0, tile.width, tile.height);
    graphics.setAlpha(0);
    graphics.setDepth(this.soilLayer.depth + 0.1);

    this.activeGlows.push({ graphics, x: tile.x, y: tile.y, tween: null });
  }

  private isBaseSoil(tileX: number, tileY: number): boolean {
    const tile = this.soilLayer?.getTileAt(tileX, tileY);
    if (!tile || !tile.tileset) return false;

    const baseIndex = tile.index - tile.tileset.firstgid;
    return baseIndex === this.SOIL_BASE;
  }

  private updateAdjacentSoilBorder(x: number, y: number): void {
    const farmTileset = this.map.getTileset("Farm");
    if (!this.soilLayer || !farmTileset) return;

    if (
      x < 0 ||
      y < 0 ||
      x >= this.soilLayer.width ||
      y >= this.soilLayer.height
    ) {
      return;
    }

    if (this.isBaseSoil(x, y)) return;

    if (this.grassLayer?.getTileAt(x, y) !== null) return;

    const soilAbove = this.isBaseSoil(x, y - 1);
    const soilBelow = this.isBaseSoil(x, y + 1);
    const soilLeft = this.isBaseSoil(x - 1, y);
    const soilRight = this.isBaseSoil(x + 1, y);

    let borderBaseIndex: number | null = null;
    if (soilAbove && soilBelow && soilLeft && soilRight)
      borderBaseIndex = this.SOIL_ALL;
    else if (soilAbove && soilBelow && soilLeft)
      borderBaseIndex = this.SOIL_UDL;
    else if (soilAbove && soilBelow && soilRight)
      borderBaseIndex = this.SOIL_UDR;
    else if (soilLeft && soilRight && soilAbove)
      borderBaseIndex = this.SOIL_LRU;
    else if (soilLeft && soilRight && soilBelow)
      borderBaseIndex = this.SOIL_LRD;
    else if (soilAbove && soilBelow) borderBaseIndex = this.SOIL_UD;
    else if (soilLeft && soilRight) borderBaseIndex = this.SOIL_LR;
    else if (soilBelow && soilRight && !soilAbove && !soilLeft)
      borderBaseIndex = this.SOIL_CORNER_DR;
    else if (soilBelow && soilLeft && !soilAbove && !soilRight)
      borderBaseIndex = this.SOIL_CORNER_DL;
    else if (soilAbove && soilRight && !soilBelow && !soilLeft)
      borderBaseIndex = this.SOIL_CORNER_UR;
    else if (soilAbove && soilLeft && !soilBelow && !soilRight)
      borderBaseIndex = this.SOIL_CORNER_UL;
    else if (soilAbove) borderBaseIndex = this.SOIL_BORDER_DOWN;
    else if (soilBelow) borderBaseIndex = this.SOIL_BORDER_UP;
    else if (soilLeft) borderBaseIndex = this.SOIL_BORDER_RIGHT;
    else if (soilRight) borderBaseIndex = this.SOIL_BORDER_LEFT;

    const firstgid = farmTileset.firstgid;
    const currentTile = this.soilLayer.getTileAt(x, y);
    const currentBaseIndex = currentTile
      ? currentTile.index - (currentTile.tileset?.firstgid ?? 0)
      : -1;

    if (borderBaseIndex !== null) {
      const newGlobalIndex = borderBaseIndex + firstgid;
      if (!currentTile || currentTile.index !== newGlobalIndex) {
        const placed = this.soilLayer.putTileAt(newGlobalIndex, x, y);
        if (placed) {
          const borderProps = (farmTileset.tileProperties as any)?.[
            borderBaseIndex
          ];
          if (borderProps) placed.properties = { ...borderProps };
          else placed.properties = {};
        }
      }
    } else {
      const isCurrentTileABorder = [
        this.SOIL_BORDER_UP,
        this.SOIL_BORDER_DOWN,
        this.SOIL_BORDER_LEFT,
        this.SOIL_BORDER_RIGHT,
        this.SOIL_LR,
        this.SOIL_UD,
        this.SOIL_LRD,
        this.SOIL_UDL,
        this.SOIL_LRU,
        this.SOIL_UDR,
        this.SOIL_ALL,
        this.SOIL_CORNER_UL,
        this.SOIL_CORNER_UR,
        this.SOIL_CORNER_DL,
        this.SOIL_CORNER_DR,
      ].includes(currentBaseIndex);

      if (isCurrentTileABorder) {
        this.soilLayer.removeTileAt(x, y);
        const glowIndex = this.activeGlows.findIndex(
          (g) => g.x === x && g.y === y
        );
        if (glowIndex > -1) {
          const removedGlow = this.activeGlows.splice(glowIndex, 1)[0];
          removedGlow.tween?.stop();
          removedGlow.graphics.destroy();
          this.updateGlowSequence();
        }
      }
    }
  }

  private updateGlowSequence(): void {
    const glowAlpha = 0.2;
    const glowDuration = 1500;
    const glowSequenceDelayFactor = 50;

    this.activeGlows.forEach((item) => {
      item.tween?.stop();
      item.tween = null;
      item.graphics.setAlpha(0);
    });

    this.activeGlows.sort((a, b) => {
      if (a.y !== b.y) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    this.activeGlows.forEach((item, index) => {
      item.tween = this.tweens.add({
        targets: item.graphics,
        alpha: { from: 0, to: glowAlpha },
        duration: glowDuration / 2,
        delay: index * glowSequenceDelayFactor,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    });
  }
}
