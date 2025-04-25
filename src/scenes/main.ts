import "phaser";

// Define a type for the stored tile info
type CarriedTileInfo = {
  x: number;
  y: number;
  index: number;
  layer: Phaser.Tilemaps.TilemapLayer;
  tileset: Phaser.Tilemaps.Tileset;
  // Add offset for orientation
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
  private isCarrying: boolean = false; // Now specifically for the two-part item

  // --- State for carried two-part item ---
  private carriedItemPart1Sprite: Phaser.GameObjects.Sprite | null = null;
  private carriedItemPart2Sprite: Phaser.GameObjects.Sprite | null = null;
  private carriedItemOriginalTile1: CarriedTileInfo | null = null;
  private carriedItemOriginalTile2: CarriedTileInfo | null = null;

  // Movement speeds
  private walkSpeed = 100; // Pixels per second
  private runSpeed = 200; // Pixels per second

  // --- Autotiling ---
  private grassLayer!: Phaser.Tilemaps.TilemapLayer; // Added for grass autotiling
  private soilLayer!: Phaser.Tilemaps.TilemapLayer; // Added for soil

  // Soil tile IDs
  private SOIL_BASE = 148;
  private SOIL_BORDER_UP = 123;
  private SOIL_BORDER_DOWN = 173;
  private SOIL_BORDER_LEFT = 147;
  private SOIL_BORDER_RIGHT = 149;
  // New Combination Borders
  private SOIL_LR = 164; // Left + Right
  private SOIL_UD = 165; // Up + Down
  private SOIL_LRD = 189; // Left + Right + Down
  private SOIL_UDL = 190; // Up + Down + Left
  private SOIL_LRU = 214; // Left + Right + Up
  private SOIL_UDR = 215; // Up + Down + Right
  private SOIL_ALL = 239; // All 4 sides
  // Inner Corner Borders (Placed on the non-soil tile adjacent to the corner)
  private SOIL_CORNER_UL = 264; // Soil is Up & Left of this tile
  private SOIL_CORNER_UR = 265; // Soil is Up & Right of this tile
  private SOIL_CORNER_DL = 266; // Soil is Down & Left of this tile
  private SOIL_CORNER_DR = 267; // Soil is Down & Right of this tile

  constructor() {
    super("main");
  }

  preload() {
    // Load the tilemap
    this.load.tilemapTiledJSON("map", "mapCopy.tmj");

    // Load all tileset images directly with the exact paths from the map file
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
    // Additional tilesets found in the map
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
    this.load.spritesheet(
      "Farm",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Farm.png",
      { frameWidth: 16, frameHeight: 16 }
    );
    // Add the missing Shadows tileset
    this.load.image(
      "Shadows",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Shadows.png"
    );

    // --- Add missing map tilesets ---
    this.load.image(
      "Shadows1",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Shadows1.png"
    );
    this.load.image(
      "Level_1",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_1.png"
    );
    this.load.spritesheet(
      "Level_2-Sheet",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_2-Sheet.png",
      { frameWidth: 80, frameHeight: 64 } // From map.tmj
    );
    this.load.spritesheet(
      "Level_3-Sheet",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_3-Sheet.png",
      { frameWidth: 112, frameHeight: 80 } // From map.tmj
    );
    // --- End of missing map tilesets ---

    // Load Player Animation Spritesheets (assuming fixed frame size for now)
    // We'll need to adjust frameWidth/frameHeight if they differ
    const frameConfig = { frameWidth: 64, frameHeight: 64 }; // Corrected size

    // Idle
    this.load.spritesheet(
      "idle_down",
      "Animations/Idle_Base/Idle_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "idle_up",
      "Animations/Idle_Base/Idle_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "idle_side",
      "Animations/Idle_Base/Idle_Side-Sheet.png",
      frameConfig
    );

    // Walk
    this.load.spritesheet(
      "walk_down",
      "Animations/Walk_Base/Walk_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "walk_up",
      "Animations/Walk_Base/Walk_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "walk_side",
      "Animations/Walk_Base/Walk_Side-Sheet.png",
      frameConfig
    );

    // Run
    this.load.spritesheet(
      "run_down",
      "Animations/Run_Base/Run_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "run_up",
      "Animations/Run_Base/Run_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "run_side",
      "Animations/Run_Base/Run_Side-Sheet.png",
      frameConfig
    );

    // Hit
    this.load.spritesheet(
      "hit_down",
      "Animations/Hit_Base/Hit_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "hit_up",
      "Animations/Hit_Base/Hit_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "hit_side",
      "Animations/Hit_Base/Hit_Side-Sheet.png",
      frameConfig
    );

    // --- Load New Animations ---

    // Carry Idle (4 frames)
    this.load.spritesheet(
      "carry_idle_down",
      "Animations/Carry_Idle/Carry_Idle_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_idle_up",
      "Animations/Carry_Idle/Carry_Idle_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_idle_side",
      "Animations/Carry_Idle/Carry_Idle_Side-Sheet.png",
      frameConfig
    );

    // Carry Walk (6 frames)
    this.load.spritesheet(
      "carry_walk_down",
      "Animations/Carry_Walk/Carry_Walk_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_walk_up",
      "Animations/Carry_Walk/Carry_Walk_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_walk_side",
      "Animations/Carry_Walk/Carry_Walk_Side-Sheet.png",
      frameConfig
    );

    // Carry Run (6 frames)
    this.load.spritesheet(
      "carry_run_down",
      "Animations/Carry_Run/Carry_Run_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_run_up",
      "Animations/Carry_Run/Carry_Run_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_run_side",
      "Animations/Carry_Run/Carry_Run_Side-Sheet.png",
      frameConfig
    );

    // Collect (8 frames)
    this.load.spritesheet(
      "collect_down",
      "Animations/Collect_Base/Collect_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "collect_up",
      "Animations/Collect_Base/Collect_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "collect_side",
      "Animations/Collect_Base/Collect_Side-Sheet.png",
      frameConfig
    );

    // Crush (8 frames)
    this.load.spritesheet(
      "crush_down",
      "Animations/Crush_Base/Crush_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "crush_up",
      "Animations/Crush_Base/Crush_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "crush_side",
      "Animations/Crush_Base/Crush_Side-Sheet.png",
      frameConfig
    );

    // Pierce (8 frames)
    this.load.spritesheet(
      "pierce_down",
      "Animations/Pierce_Base/Pierce_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "pierce_up",
      "Animations/Pierce_Base/Pierce_Top-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "pierce_side",
      "Animations/Pierce_Base/Pierce_Side-Sheet.png",
      frameConfig
    );

    // Slice (8 frames)
    this.load.spritesheet(
      "slice_down",
      "Animations/Slice_Base/Slice_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "slice_up",
      "Animations/Slice_Base/Slice_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "slice_side",
      "Animations/Slice_Base/Slice_Side-Sheet.png",
      frameConfig
    );

    // Watering (8 frames)
    this.load.spritesheet(
      "watering_down",
      "Animations/Watering_Base/Watering_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "watering_up",
      "Animations/Watering_Base/Watering_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "watering_side",
      "Animations/Watering_Base/Watering_Side-Sheet.png",
      frameConfig
    );

    // Fishing (8 frames, no repeat)
    this.load.spritesheet(
      "fishing_down",
      "Animations/Fishing_Base/Fishing_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "fishing_up",
      "Animations/Fishing_Base/Fishing_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "fishing_side",
      "Animations/Fishing_Base/Fishing_Side-Sheet.png",
      frameConfig
    );
  }

  create() {
    // Create the tilemap
    this.map = this.make.tilemap({ key: "map" });

    // Automatically load all tilesets defined in the map
    const tilesets: Phaser.Tilemaps.Tileset[] = [];

    // Get all tileset names from the map
    const mapTilesets = this.map.tilesets;
    console.log(
      "Map contains these tilesets:",
      mapTilesets.map((ts) => ts.name)
    );

    // Add each tileset
    for (const mapTileset of mapTilesets) {
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
    }

    // Check if we have any tilesets loaded
    if (tilesets.length === 0) {
      console.error(
        "No tilesets were loaded successfully. Cannot create map layers."
      );
      return;
    }

    // Create all map layers
    const layersCreated: string[] = [];
    const layerObjects: Phaser.Tilemaps.TilemapLayer[] = []; // Store layer objects

    for (const layer of this.map.layers) {
      try {
        const createdLayer = this.map.createLayer(layer.name, tilesets, 0, 0);
        if (createdLayer) {
          layersCreated.push(layer.name);
          layerObjects.push(createdLayer); // Store the created layer
          console.log(`Successfully created layer: ${layer.name}`);

          // Set depth based on layer name or index
          if (layer.name.includes("-2")) {
            createdLayer.setDepth(-2); //underground
          } else if (layer.name.includes("-1")) {
            createdLayer.setDepth(-1); //underground
          } else if (layer.name.includes("0")) {
            createdLayer.setDepth(0); // Default for other layers, including 0
          } else if (layer.name.includes("1")) {
            createdLayer.setDepth(1); // Below player
          } else if (layer.name.includes("2")) {
            createdLayer.setDepth(2); // Below player
          } else if (layer.name.includes("4")) {
            createdLayer.setDepth(4); // Above player
          } else if (layer.name.includes("5")) {
            createdLayer.setDepth(5); // Above player
          }
          // Set each layer's visible property according to the map data
          if (layer.visible === false) {
            createdLayer.setVisible(false);
            console.log(
              `Layer ${layer.name} set to invisible as defined in map`
            );
          }
        } else {
          console.error(`Failed to create layer: ${layer.name}`);
        }
      } catch (error) {
        console.error(`Error creating layer ${layer.name}:`, error);
      }
    }

    // --- Player Setup ---
    // Spawn Player
    this.player = this.add.sprite(100, 100, "idle_down"); // Start position and initial sprite
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(3); // Set depth between layer 2 and layer 3
    // this.player.setScale(2); // Optional: Adjust scale if needed

    // Player Animations
    const anims = this.anims;
    const frameRate = 10; // Adjust frame rate as needed
    const repeat = -1; // Loop infinitely

    // Idle (4 frames)
    anims.create({
      key: "idle_down",
      frames: anims.generateFrameNumbers("idle_down", { end: 3 }), // Specify frame count
      frameRate: frameRate / 2,
      repeat: repeat,
    });
    anims.create({
      key: "idle_up",
      frames: anims.generateFrameNumbers("idle_up", { end: 3 }), // Specify frame count
      frameRate: frameRate / 2,
      repeat: repeat,
    });
    anims.create({
      key: "idle_side",
      frames: anims.generateFrameNumbers("idle_side", { end: 3 }), // Specify frame count
      frameRate: frameRate / 2,
      repeat: repeat,
    });

    // Walk (6 frames)
    anims.create({
      key: "walk_down",
      frames: anims.generateFrameNumbers("walk_down", { end: 5 }), // Specify frame count
      frameRate: frameRate,
      repeat: repeat,
    });
    anims.create({
      key: "walk_up",
      frames: anims.generateFrameNumbers("walk_up", { end: 5 }), // Specify frame count
      frameRate: frameRate,
      repeat: repeat,
    });
    anims.create({
      key: "walk_side",
      frames: anims.generateFrameNumbers("walk_side", { end: 5 }), // Specify frame count
      frameRate: frameRate,
      repeat: repeat,
    });

    // Run (6 frames)
    anims.create({
      key: "run_down",
      frames: anims.generateFrameNumbers("run_down", { end: 5 }), // Specify frame count
      frameRate: frameRate * 1.5,
      repeat: repeat,
    });
    anims.create({
      key: "run_up",
      frames: anims.generateFrameNumbers("run_up", { end: 5 }), // Specify frame count
      frameRate: frameRate * 1.5,
      repeat: repeat,
    });
    anims.create({
      key: "run_side",
      frames: anims.generateFrameNumbers("run_side", { end: 5 }), // Specify frame count
      frameRate: frameRate * 1.5,
      repeat: repeat,
    });

    // Hit (4 frames, no repeat)
    anims.create({
      key: "hit_down",
      frames: anims.generateFrameNumbers("hit_down", { end: 3 }), // Specify frame count
      frameRate: frameRate * 1.2,
      repeat: 0,
    });
    anims.create({
      key: "hit_up",
      frames: anims.generateFrameNumbers("hit_up", { end: 3 }), // Specify frame count
      frameRate: frameRate * 1.2,
      repeat: 0,
    });
    anims.create({
      key: "hit_side",
      frames: anims.generateFrameNumbers("hit_side", { end: 3 }), // Specify frame count
      frameRate: frameRate * 1.2,
      repeat: 0,
    });

    // --- Create New Animations ---
    const actionFrameRate = frameRate * 1.2; // Frame rate for non-looping actions

    // Carry Idle (4 frames, loop)
    anims.create({
      key: "carry_idle_down",
      frames: anims.generateFrameNumbers("carry_idle_down", { end: 3 }),
      frameRate: frameRate / 2,
      repeat: -1,
    });
    anims.create({
      key: "carry_idle_up",
      frames: anims.generateFrameNumbers("carry_idle_up", { end: 3 }),
      frameRate: frameRate / 2,
      repeat: -1,
    });
    anims.create({
      key: "carry_idle_side",
      frames: anims.generateFrameNumbers("carry_idle_side", { end: 3 }),
      frameRate: frameRate / 2,
      repeat: -1,
    });

    // Carry Walk (6 frames, loop)
    anims.create({
      key: "carry_walk_down",
      frames: anims.generateFrameNumbers("carry_walk_down", { end: 5 }),
      frameRate: frameRate,
      repeat: -1,
    });
    anims.create({
      key: "carry_walk_up",
      frames: anims.generateFrameNumbers("carry_walk_up", { end: 5 }),
      frameRate: frameRate,
      repeat: -1,
    });
    anims.create({
      key: "carry_walk_side",
      frames: anims.generateFrameNumbers("carry_walk_side", { end: 5 }),
      frameRate: frameRate,
      repeat: -1,
    });

    // Carry Run (6 frames, loop)
    anims.create({
      key: "carry_run_down",
      frames: anims.generateFrameNumbers("carry_run_down", { end: 5 }),
      frameRate: frameRate * 1.5,
      repeat: -1,
    });
    anims.create({
      key: "carry_run_up",
      frames: anims.generateFrameNumbers("carry_run_up", { end: 5 }),
      frameRate: frameRate * 1.5,
      repeat: -1,
    });
    anims.create({
      key: "carry_run_side",
      frames: anims.generateFrameNumbers("carry_run_side", { end: 5 }),
      frameRate: frameRate * 1.5,
      repeat: -1,
    });

    // Collect (8 frames, no repeat)
    anims.create({
      key: "collect_down",
      frames: anims.generateFrameNumbers("collect_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "collect_up",
      frames: anims.generateFrameNumbers("collect_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "collect_side",
      frames: anims.generateFrameNumbers("collect_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Crush (8 frames, no repeat)
    anims.create({
      key: "crush_down",
      frames: anims.generateFrameNumbers("crush_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "crush_up",
      frames: anims.generateFrameNumbers("crush_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "crush_side",
      frames: anims.generateFrameNumbers("crush_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Pierce (8 frames, no repeat)
    anims.create({
      key: "pierce_down",
      frames: anims.generateFrameNumbers("pierce_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "pierce_up",
      frames: anims.generateFrameNumbers("pierce_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "pierce_side",
      frames: anims.generateFrameNumbers("pierce_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Slice (8 frames, no repeat)
    anims.create({
      key: "slice_down",
      frames: anims.generateFrameNumbers("slice_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "slice_up",
      frames: anims.generateFrameNumbers("slice_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "slice_side",
      frames: anims.generateFrameNumbers("slice_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Watering (8 frames, no repeat)
    anims.create({
      key: "watering_down",
      frames: anims.generateFrameNumbers("watering_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "watering_up",
      frames: anims.generateFrameNumbers("watering_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "watering_side",
      frames: anims.generateFrameNumbers("watering_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Fishing (8 frames, no repeat)
    anims.create({
      key: "fishing_down",
      frames: anims.generateFrameNumbers("fishing_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "fishing_up",
      frames: anims.generateFrameNumbers("fishing_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "fishing_side",
      frames: anims.generateFrameNumbers("fishing_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // --- Initialize Grass Layer ---
    const layer0 = this.map.getLayer("Tile Layer 0")?.tilemapLayer;
    if (layer0) {
      this.grassLayer = layer0;
      console.log("Grass layer 'Tile Layer 0' initialized.");
    } else {
      console.error("Failed to find 'Tile Layer 0'. Autotiling will not work.");
    }

    // --- Initialize Soil Layer ---
    const layer1 = this.map.getLayer("Tile Layer 1")?.tilemapLayer;
    if (layer1) {
      this.soilLayer = layer1;
      console.log("Soil layer 'Tile Layer 1' initialized.");
    } else {
      console.warn(
        "Could not find 'Tile Layer 1'. Soil placement might not work."
      );
      // Create a dummy layer if it doesn't exist to prevent errors, though placement won't be visible
      // You might want to ensure 'Tile Layer 1' exists in your Tiled map.
      this.soilLayer = this.map.createBlankLayer(
        "Tile Layer 1",
        tilesets,
        0,
        0
      );
      if (this.soilLayer) {
        this.soilLayer.setDepth(1); // Match expected depth
        console.log("Created a blank 'Tile Layer 1' for soil.");
      } else {
        console.error("Failed to create even a blank 'Tile Layer 1'.");
      }
    }

    // --- Input Setup ---
    // Use WASD instead of arrow keys for camera control
    this.input.keyboard.createCursorKeys(); // Still needed for camera controls

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.setZoom(3); // Adjust zoom for better viewing

    // Make camera follow player
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // Round pixels, lerp values

    // Setup player movement keys
    this.keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SHIFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    // Play initial animation
    this.player.anims.play("idle_down", true);

    // Listen for animation completion
    this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      // Return to idle after other non-looping animations if needed
      if (
        !this.isCarrying &&
        this.player.anims.currentAnim && // Check if currentAnim exists
        !this.player.anims.currentAnim.repeat // Check if current anim doesn't loop
      ) {
        const idleAnim = this.getIdleAnimKey();
        if (this.player.anims.currentAnim.key !== idleAnim) {
          this.player.anims.play(idleAnim, true);
        }
      } else if (
        this.isCarrying &&
        this.player.anims.currentAnim && // Check if currentAnim exists
        !this.player.anims.currentAnim.repeat
      ) {
        const idleAnim = this.getCarryIdleAnimKey();
        if (this.player.anims.currentAnim.key !== idleAnim) {
          this.player.anims.play(idleAnim, true);
        }
      }
    });

    // --- Add Click Listener ---
    this.input.on("pointerdown", this.handlePointerDown, this);
  }

  update(_: number, delta: number) {
    // --- Update Carried Item Position ---
    if (this.isCarrying) {
      const relOffsetX = this.carriedItemOriginalTile1?.relativeOffsetX ?? 1; // Default to horizontal if missing
      const relOffsetY = this.carriedItemOriginalTile1?.relativeOffsetY ?? 0;
      const baseOffsetX = 0; // Centered horizontally relative to player
      const baseOffsetY = -24; // Position above the player\'s head
      const spacing = 8; // Half the distance between the centers of the two sprites

      // Calculate world offset based on relative tile offset
      // We divide by 2 because spacing is half the distance, and multiply by tile size for world coords
      const worldOffsetX = relOffsetX * (this.map.tileWidth / 2);
      const worldOffsetY = relOffsetY * (this.map.tileHeight / 2);

      if (this.carriedItemPart1Sprite) {
        // Part 1 is positioned relative to player + base offset, shifted slightly opposite the relative offset
        this.carriedItemPart1Sprite.setPosition(
          this.player.x +
            baseOffsetX -
            worldOffsetX / (Math.abs(relOffsetX) + Math.abs(relOffsetY) || 1), // Normalize offset vector roughly
          this.player.y +
            baseOffsetY -
            worldOffsetY / (Math.abs(relOffsetX) + Math.abs(relOffsetY) || 1)
        );
      }
      if (this.carriedItemPart2Sprite) {
        // Part 2 is positioned relative to player + base offset, shifted slightly along the relative offset
        this.carriedItemPart2Sprite.setPosition(
          this.player.x +
            baseOffsetX +
            worldOffsetX / (Math.abs(relOffsetX) + Math.abs(relOffsetY) || 1),
          this.player.y +
            baseOffsetY +
            worldOffsetY / (Math.abs(relOffsetX) + Math.abs(relOffsetY) || 1)
        );
      }
    }

    // Player Animation & Movement Logic
    const walkSpeed = this.walkSpeed;
    const runSpeed = this.runSpeed;
    const isMovingW = this.keys.W.isDown;
    const isMovingA = this.keys.A.isDown;
    const isMovingS = this.keys.S.isDown;
    const isMovingD = this.keys.D.isDown;
    const isRunning = this.keys.SHIFT.isDown;
    const isActivelyMoving = isMovingW || isMovingA || isMovingS || isMovingD;

    let currentAnim = this.player.anims.currentAnim?.key || "";
    let isPlayingAction =
      this.player.anims.isPlaying &&
      !currentAnim.includes("idle") &&
      !currentAnim.includes("walk") &&
      !currentAnim.includes("run");
    let newAnim = "";
    let flipX = this.player.flipX;

    let moveX = 0;
    let moveY = 0;

    // --- Movement/Idle (only if no action animation is playing) ---
    if (!isPlayingAction) {
      // Restore check for isCarrying to use carry_ animations
      const basePrefix = this.isCarrying ? "carry_" : "";
      const movePrefix = isRunning ? `${basePrefix}run_` : `${basePrefix}walk_`;

      if (isActivelyMoving) {
        // Check if actively trying to move
        // Determine direction and movement speed
        const currentSpeed = isRunning ? runSpeed : walkSpeed;

        if (isMovingW) {
          this.currentDir = "up";
          newAnim = `${movePrefix}up`;
          moveY = -currentSpeed;
        } else if (isMovingS) {
          this.currentDir = "down";
          newAnim = `${movePrefix}down`;
          moveY = currentSpeed;
        }

        if (isMovingA) {
          this.currentDir = "left";
          newAnim = `${movePrefix}side`;
          flipX = true;
          moveX = -currentSpeed;
          if (isMovingW || isMovingS) moveY = 0; // Prioritize horizontal animation on diagonal
        } else if (isMovingD) {
          this.currentDir = "right";
          newAnim = `${movePrefix}side`;
          flipX = false;
          moveX = currentSpeed;
          if (isMovingW || isMovingS) moveY = 0; // Prioritize horizontal animation on diagonal
        }
      } else {
        // Not moving, play idle animation for the current direction and carry state
        // Restore check for isCarrying to use carry_ animations
        const idlePrefix = this.isCarrying ? "carry_idle_" : "idle_";
        // Map direction to animation key suffix (_up, _down, _side)
        const directionSuffix =
          this.currentDir === "up" || this.currentDir === "down"
            ? this.currentDir
            : "side";
        newAnim = `${idlePrefix}${directionSuffix}`;
        flipX = this.currentDir === "left";
      }
    }

    // Set flip before potentially playing animation
    this.player.setFlipX(flipX);

    // Play animation if it's different from the current one or an action just started
    if (newAnim && (newAnim !== currentAnim || !this.player.anims.isPlaying)) {
      this.player.anims.play(newAnim, true);
    }

    // Apply movement based on calculated velocity and delta time, ONLY if not playing an action
    if (!isPlayingAction) {
      // Normalize diagonal movement
      const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
      if (magnitude > 0) {
        const speedToUse = isRunning ? runSpeed : walkSpeed;
        moveX = (moveX / magnitude) * speedToUse;
        moveY = (moveY / magnitude) * speedToUse;
      }

      const tileSize = this.map.tileWidth;
      const newX = this.player.x + moveX * (delta / 1000);
      const newY = this.player.y + moveY * (delta / 1000);

      // Check collisions for both X and Y movement separately
      let canMoveX = !this.hasTileCollision(newX, this.player.y, tileSize);
      let canMoveY = !this.hasTileCollision(this.player.x, newY, tileSize);

      // Apply movement only in allowed directions
      if (canMoveX) {
        this.player.x = newX;
      }
      if (canMoveY) {
        this.player.y = newY;
      }
    }
  }

  // --- Helper Methods ---

  // Helper to get the current idle animation key based on direction and carry state
  private getIdleAnimKey(): string {
    const directionSuffix =
      this.currentDir === "up" || this.currentDir === "down"
        ? this.currentDir
        : "side";
    return `idle_${directionSuffix}`;
  }
  private getCarryIdleAnimKey(): string {
    const directionSuffix =
      this.currentDir === "up" || this.currentDir === "down"
        ? this.currentDir
        : "side";
    return `carry_idle_${directionSuffix}`;
  }

  /**
   * Finds the first tile adjacent to the player with the 'stump' property set to true.
   * Returns the Tile object or null if none found.
   */
  private findAdjacentStumpTile(): Phaser.Tilemaps.Tile | null {
    const playerTileX = this.map.worldToTileX(this.player.x);
    const playerTileY = this.map.worldToTileY(this.player.y);
    const adjacentCoords = [
      { x: playerTileX, y: playerTileY - 1 }, // Up
      { x: playerTileX, y: playerTileY + 1 }, // Down
      { x: playerTileX - 1, y: playerTileY }, // Left
      { x: playerTileX + 1, y: playerTileY }, // Right
    ];
    // Define layers to check for stumps (adjust as needed)
    const stumpCheckLayers = [
      "Tile Layer 0",
      "Tile Layer 1",
      "Tile Layer 2",
      "Tile Layer 3",
      "Tile Layer 4",
      "Tile Layer 5",
      "Tile Layer -1",
      "Tile Layer -2",
    ];

    for (const coord of adjacentCoords) {
      for (const layerName of stumpCheckLayers) {
        const layer = this.map.getLayer(layerName)?.tilemapLayer;
        if (layer) {
          const tile = layer.getTileAt(coord.x, coord.y);
          if (tile?.properties?.stump === true) {
            return tile; // Found the first adjacent stump
          }
        }
      }
    }
    return null; // No adjacent stump found
  }

  // --- Collision Detection ---
  private hasTileCollision(x: number, y: number, tileSize: number): boolean {
    const tileX = Math.floor(x / tileSize);
    const tileY = Math.floor(y / tileSize);

    // Iterate through all layers of the map
    for (const layer of this.map.layers) {
      // Check if the layer is actually created and visible
      if (layer.tilemapLayer && layer.tilemapLayer.visible) {
        const tile = layer.tilemapLayer.getTileAt(tileX, tileY);
        // Check if the tile exists and has a collision property set to true
        if (tile && tile.properties && tile.properties.collision === true) {
          // console.log(`Collision detected at [${tileX}, ${tileY}] on layer ${layer.name}`);
          return true; // Collision detected
        }
      }
    }
    return false; // No collision detected on any relevant layer
  }

  // --- CLICK HANDLING ---
  private handlePointerDown() {
    // --- 1. Check if Putting Down ---
    if (this.isCarrying) {
      this.putDownTwoPartItem();
      return;
    }

    // --- 2. Check if Action Animation is Playing ---
    let currentAnimKey = this.player.anims.currentAnim?.key || "";
    let isPlayingActionAnim =
      this.player.anims.isPlaying &&
      !currentAnimKey.includes("idle") &&
      !currentAnimKey.includes("walk") &&
      !currentAnimKey.includes("run") &&
      !currentAnimKey.includes("carry");

    if (isPlayingActionAnim) {
      console.log("Player already performing an action.");
      return;
    }

    // --- 3. Check for Adjacent Stump (Tree Cutting) --- NEW
    const adjacentStump = this.findAdjacentStumpTile();
    if (adjacentStump) {
      console.log(
        `Player attempting to cut tree via stump at [${adjacentStump.x}, ${adjacentStump.y}]`
      );
      // Play Slice Animation
      const actionAnimPrefix = "slice";
      const directionSuffix =
        this.currentDir === "up" || this.currentDir === "down"
          ? this.currentDir
          : "side";
      const actionAnimKey = `${actionAnimPrefix}_${directionSuffix}`;
      const flipX = this.currentDir === "left";
      this.player.setFlipX(flipX);
      this.player.anims.play(actionAnimKey, true);

      // Initiate tree cutting logic
      this.cutTree(adjacentStump);
      return; // Tree cutting action handled
    }

    // --- 4. Check for Adjacent Water (Fishing) ---
    const playerTileX = this.map.worldToTileX(this.player.x);
    const playerTileY = this.map.worldToTileY(this.player.y);
    const adjacentCoords = [
      { x: playerTileX, y: playerTileY - 1 },
      { x: playerTileX, y: playerTileY + 1 },
      { x: playerTileX - 1, y: playerTileY },
      { x: playerTileX + 1, y: playerTileY },
    ];
    const waterCheckLayers = [
      "Tile Layer 0",
      "Tile Layer 1",
      "Tile Layer 2",
      "Tile Layer 3",
      "Tile Layer 4",
      "Tile Layer 5",
      "Tile Layer -1",
      "Tile Layer -2",
    ];
    let foundAdjacentWater = false;
    for (const coord of adjacentCoords) {
      for (const layerName of waterCheckLayers) {
        const layer = this.map.getLayer(layerName)?.tilemapLayer;
        if (layer) {
          const tile = layer.getTileAt(coord.x, coord.y);
          if (tile?.properties?.water === true) {
            foundAdjacentWater = true;
            break;
          }
        }
      }
      if (foundAdjacentWater) break;
    }

    if (foundAdjacentWater) {
      const actionAnimPrefix = "fishing";
      const directionSuffix =
        this.currentDir === "up" || this.currentDir === "down"
          ? this.currentDir
          : "side";
      const actionAnimKey = `${actionAnimPrefix}_${directionSuffix}`;
      const flipX = this.currentDir === "left";
      console.log(
        `Playing fishing animation (adjacent water found): ${actionAnimKey}`
      );
      this.player.setFlipX(flipX);
      this.player.anims.play(actionAnimKey, true);
      return; // Fishing action handled
    }

    // --- 5. Check for Two-Part Pickup Under Player ---
    let tile1: Phaser.Tilemaps.Tile | null = null;
    let tile2: Phaser.Tilemaps.Tile | null = null;
    const pickupCheckLayers = [
      "Tile Layer 0",
      "Tile Layer 1",
      "Tile Layer 2",
      "Tile Layer 3",
      "Tile Layer 4",
      "Tile Layer 5",
    ];
    for (const layerName of pickupCheckLayers) {
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
      if (tile1 && tile2) break;
    }

    if (tile1 && tile2) {
      console.log("Attempting to pick up crate under player.");
      this.pickupTwoPartItem(tile1, tile2);
      return; // Pickup action handled
    }

    // --- 6. Primary Action: Crush Tile Under Player ---
    if (
      this.grassLayer &&
      this.grassLayer.getTileAt(playerTileX, playerTileY)
    ) {
      console.log(`Player crushing grass at [${playerTileX}, ${playerTileY}].`);
      const actionAnimPrefix = "crush";
      const directionSuffix =
        this.currentDir === "up" || this.currentDir === "down"
          ? this.currentDir
          : "side";
      const actionAnimKey = `${actionAnimPrefix}_${directionSuffix}`;
      const flipX = this.currentDir === "left";
      this.player.setFlipX(flipX);
      this.player.anims.play(actionAnimKey, true);
      this.grassLayer.removeTileAt(playerTileX, playerTileY);
      this.updateGrassBorders(playerTileX, playerTileY);
      return; // Crush action handled
    }

    // --- 7. Check for Soil Placement ---
    // Use player's tile coordinates, similar to grass crushing
    // const pointerTileX = this.map.worldToTileX(this.input.activePointer.worldX);
    // const pointerTileY = this.map.worldToTileY(this.input.activePointer.worldY);

    // Check if soil can be placed at the player's current location
    if (this.canPlaceSoil(playerTileX, playerTileY)) {
      console.log(
        `Placing soil at player location [${playerTileX}, ${playerTileY}]`
      );
      // Play Crush animation
      const actionAnimPrefix = "crush";
      const directionSuffix =
        this.currentDir === "up" || this.currentDir === "down"
          ? this.currentDir
          : "side";
      const actionAnimKey = `${actionAnimPrefix}_${directionSuffix}`;
      const flipX = this.currentDir === "left";
      this.player.setFlipX(flipX);
      this.player.anims.play(actionAnimKey, true);

      this.placeSoilTile(playerTileX, playerTileY);
      return; // Soil placement handled
    }

    // --- 8. No Action Found ---
    console.log(
      "No action found for click (No stump, fishing, pickup, grass, or soil placement)."
    );
    // Example: Play 'hit' animation as feedback
    /* ... */
  } // End of handlePointerDown

  // --- TWO-PART ITEM METHODS ---

  private pickupTwoPartItem(
    tile1: Phaser.Tilemaps.Tile,
    tile2: Phaser.Tilemaps.Tile
  ) {
    if (
      !tile1.tilemapLayer ||
      !tile2.tilemapLayer ||
      !tile1.tileset ||
      !tile2.tileset
    ) {
      console.error("Cannot pick up item: Missing layer or tileset info.");
      return;
    }

    console.log("Picking up two-part item");
    this.isCarrying = true;

    // Store original tile data - offset is now fixed
    // const offsetX = tile2.x - tile1.x; // No longer needed
    // const offsetY = tile2.y - tile1.y;
    this.carriedItemOriginalTile1 = {
      x: tile1.x,
      y: tile1.y,
      index: tile1.index,
      layer: tile1.tilemapLayer,
      tileset: tile1.tileset,
      relativeOffsetX: 0, // Fixed vertical offset
      relativeOffsetY: -1,
    };
    this.carriedItemOriginalTile2 = {
      x: tile2.x,
      y: tile2.y,
      index: tile2.index,
      layer: tile2.tilemapLayer,
      tileset: tile2.tileset,
      // No offset needed for tile 2 info
    };

    // Remove tiles from the map
    tile1.tilemapLayer.removeTileAt(tile1.x, tile1.y);
    tile2.tilemapLayer.removeTileAt(tile2.x, tile2.y);

    // Create sprites to represent the carried items
    const tilesetKey1 = tile1.tileset.name; // Assumes tileset name matches loaded key
    const frameIndex1 = tile1.index - tile1.tileset.firstgid;
    const tilesetKey2 = tile2.tileset.name;
    const frameIndex2 = tile2.index - tile2.tileset.firstgid;

    // Initial position above player - adjust offsets as needed
    const offsetX1 = -8;
    const offsetY1 = -24;
    const offsetX2 = 8;
    const offsetY2 = -24;

    this.carriedItemPart1Sprite = this.add.sprite(
      this.player.x + offsetX1,
      this.player.y + offsetY1,
      tilesetKey1,
      frameIndex1
    );
    this.carriedItemPart2Sprite = this.add.sprite(
      this.player.x + offsetX2,
      this.player.y + offsetY2,
      tilesetKey2,
      frameIndex2
    );

    // Set depth to appear above player
    const carriedItemDepth = this.player.depth + 1;
    this.carriedItemPart1Sprite.setDepth(carriedItemDepth);
    this.carriedItemPart2Sprite.setDepth(carriedItemDepth);

    // Play carry idle animation immediately
    this.player.anims.play(this.getCarryIdleAnimKey(), true);
  }

  private putDownTwoPartItem() {
    if (
      !this.carriedItemOriginalTile1 ||
      !this.carriedItemOriginalTile2 ||
      this.carriedItemOriginalTile1.relativeOffsetX === undefined || // Check offset exists
      this.carriedItemOriginalTile1.relativeOffsetY === undefined
    ) {
      console.error("Cannot put down item: Missing item data or offset.");
      this.isCarrying = false; // Reset carry state anyway
      return;
    }

    console.log("Putting down two-part item");

    // Determine drop location (in front of player)
    let dropTileX1 = this.map.worldToTileX(this.player.x);
    let dropTileY1 = this.map.worldToTileY(this.player.y);

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

    // Calculate second tile position based on stored offset
    const dropTileX2 =
      dropTileX1 + this.carriedItemOriginalTile1.relativeOffsetX;
    const dropTileY2 =
      dropTileY1 + this.carriedItemOriginalTile1.relativeOffsetY;

    // Validity check for BOTH locations
    const targetLayer = this.carriedItemOriginalTile1.layer;
    const currentTile1 = targetLayer.getTileAt(dropTileX1, dropTileY1);
    const currentTile2 = targetLayer.getTileAt(dropTileX2, dropTileY2);
    // Check for collisions at the world coordinates corresponding to the tiles
    const collision1 = this.hasTileCollision(
      targetLayer.tileToWorldX(dropTileX1) + this.map.tileWidth / 2, // Check center of tile
      targetLayer.tileToWorldY(dropTileY1) + this.map.tileHeight / 2,
      this.map.tileWidth
    );
    const collision2 = this.hasTileCollision(
      targetLayer.tileToWorldX(dropTileX2) + this.map.tileWidth / 2,
      targetLayer.tileToWorldY(dropTileY2) + this.map.tileHeight / 2,
      this.map.tileWidth
    );

    if (currentTile1 || currentTile2 || collision1 || collision2) {
      console.warn("Cannot put down item: Target location obstructed.");
      // Maybe provide feedback to the player here
      return; // Don't drop if obstructed
    }

    // Place tiles back
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

    // --- Restore custom properties ---
    if (newTile1) {
      // tile1 is the bottom one
      if (!newTile1.properties) newTile1.properties = {}; // Initialize if needed
      newTile1.properties.canPickup1_2 = true;
    }
    if (newTile2) {
      // tile2 is the top one
      if (!newTile2.properties) newTile2.properties = {}; // Initialize if needed
      newTile2.properties.canPickup2_2 = true;
    }

    // Clean up sprites and state
    this.carriedItemPart1Sprite?.destroy();
    this.carriedItemPart2Sprite?.destroy();
    this.carriedItemPart1Sprite = null;
    this.carriedItemPart2Sprite = null;
    this.carriedItemOriginalTile1 = null;
    this.carriedItemOriginalTile2 = null;

    this.isCarrying = false;

    // Ensure player returns to normal idle animation
    this.player.anims.play(this.getIdleAnimKey(), true);
  }

  // --- GRASS AUTOTILING METHODS ---

  /**
   * Checks if a tile exists on the grass layer at the given coordinates.
   */
  private isGrass(tileX: number, tileY: number): boolean {
    if (!this.grassLayer) return false;
    // Add boundary checks if needed
    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= this.grassLayer.width ||
      tileY >= this.grassLayer.height
    )
      return false;
    return this.grassLayer.getTileAt(tileX, tileY) !== null;
  }

  /**
   * Calculates the correct grass tile index based on its 8 neighbors.
   * Uses a full 8-way bitmask: N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128
   * Returns the 0-based tile index relative to the 'Floors_Tiles' tileset image, or null.
   */
  private calculateGrassTileIndex(
    tileX: number,
    tileY: number,
    removedX: number,
    removedY: number
  ): number | null {
    if (!this.grassLayer) return null;

    // Helper checks if neighbor is grass, accounting for the removed tile
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

    // Calculate 8-way mask
    let mask = 0;
    if (isNeighborGrass(tileX, tileY - 1)) mask += 1; // N
    if (isNeighborGrass(tileX + 1, tileY - 1)) mask += 2; // NE
    if (isNeighborGrass(tileX + 1, tileY)) mask += 4; // E
    if (isNeighborGrass(tileX + 1, tileY + 1)) mask += 8; // SE
    if (isNeighborGrass(tileX, tileY + 1)) mask += 16; // S
    if (isNeighborGrass(tileX - 1, tileY + 1)) mask += 32; // SW
    if (isNeighborGrass(tileX - 1, tileY)) mask += 64; // W
    if (isNeighborGrass(tileX - 1, tileY - 1)) mask += 128; // NW

    // --- 8-Way Bitmask to Tile Index Mapping ---
    // Using direct indices from user list: 1, 2, 3, 25, 26, 28, 29, 50, 54, 75, 76, 78, 79, 101, 102, 103, 252
    const tileIndexMap_8Way: { [key: number]: number | null } = {
      // Mask: Value -> Your Index (Directly from list, 0 is unused)
      255: 252, // Full Grass (Verified)

      // --- Edges ---
      254: 102, // Top Edge (Verified)
      251: 50, // Right Edge (Verified)
      239: 2, // Bottom Edge (Verified)
      191: 54, // Left Edge (Verified)

      // --- Outer Corners ---
      248: 76, // Standard Outer Top-Left (Verified)
      247: 25, // Observed Outer Top-Left (Verified)
      225: 26, // Standard Outer Top-Right (Verified)
      223: 29, // Observed Outer Top-Right (Verified)
      15: 28, // Standard Outer Bottom-Right (Verified)
      127: 79, // Observed Outer Bottom-Right (Verified)
      60: 78, // Standard Outer Bottom-Left (Verified)
      253: 75, // Observed Outer Bottom-Left (Verified)

      // --- Inner Corners ---
      112: 76, // Standard Inner Top-Right
      193: 26, // Standard Inner Bottom-Right
      7: 28, // Standard Inner Bottom-Left
      28: 78, // Standard Inner Top-Left
      // Additional observed masks for corners/edges when forming trails:
      231: 2, // H-Trail: Inner Bottom-Right -> Bottom Edge
      207: 2, // H-Trail: Inner Bottom-Left -> Bottom Edge
      252: 102, // H-Trail: Inner Top-Left -> Top Edge
      126: 102, // H-Trail: Inner Top-Right -> Top Edge
      199: 2, // H-Trail: Inner Bottom-Right (alt) -> Bottom Edge
      124: 102, // H-Trail: Inner Top-Left (alt) -> Top Edge
      // Masks observed when extending vertical trails:
      243: 50, // V-Trail: NW Neighbor -> Left Edge - ADDED
      159: 54, // V-Trail: NE Neighbor -> Right Edge - ADDED
      249: 50, // V-Trail: W Neighbor -> Inner Bottom-Left - ADDED (Verify Visually)
      63: 54, // V-Trail: E Neighbor -> Inner Bottom-Right - ADDED (Verify Visually)
      241: 50, // V-Trail: S Neighbor -> Inner Bottom-Left - ADDED (Verify Visually)
      31: 54, // V-Trail: N Neighbor -> Inner Bottom-Right - ADDED (Verify Visually)

      // --- Straights --- (Standard masks - May need observed ones later)
      238: 77, // Horizontal Middle (Tile 103). No N, S.
      187: 52, // Vertical Middle (Tile 101). No E, W.

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

      //81: 52,

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

      // --- Dirt ---
      0: 53, // No neighbors -> Full Dirt
    };

    // Find the index from the map
    let resultIndex = tileIndexMap_8Way[mask];

    // Fallback logic
    if (resultIndex === undefined) {
      console.warn(
        `Mask ${mask} not found in 8-way map for [${tileX}, ${tileY}]. Falling back.`
      );
      // More specific fallbacks could be added, e.g., based on cardinal mask
      resultIndex = 252; // Fallback to full grass (using the direct index now)
    }

    console.log(
      `Final Calc for [${tileX}, ${tileY}] (Removed [${removedX}, ${removedY}]): 8-Way Mask=${mask} -> Local Index=${resultIndex}`
    );

    return resultIndex; // Return the direct index (or null)
  }

  /**
   * Updates the 8 neighbors of a revealed dirt tile (targetX, targetY)
   * to have the correct grass borders. Uses a two-pass approach.
   */
  private updateGrassBorders(targetX: number, targetY: number): void {
    if (!this.grassLayer) return;

    const tileset = this.map.getTileset("Floors_Tiles");
    if (!tileset) {
      console.error(
        "Could not find 'Floors_Tiles' tileset to update grass border."
      );
      return;
    }
    const firstGid = tileset.firstgid;

    console.log(
      `Updating borders around [${targetX}, ${targetY}] using tileset '${tileset.name}' starting at GID ${firstGid}`
    );

    // Pass 1: Calculate all required updates
    const updates: { x: number; y: number; index: number | null }[] = [];
    for (let y = targetY - 1; y <= targetY + 1; y++) {
      for (let x = targetX - 1; x <= targetX + 1; x++) {
        if (x === targetX && y === targetY) continue; // Skip center

        // Check bounds *before* calling isGrass or calculateGrassTileIndex
        if (
          x >= 0 &&
          y >= 0 &&
          x < this.grassLayer.width &&
          y < this.grassLayer.height
        ) {
          // Only calculate updates for tiles that ARE currently grass
          // Need to check the actual tile object on the layer
          const currentTile = this.grassLayer.getTileAt(x, y);
          if (currentTile !== null) {
            const localIndex = this.calculateGrassTileIndex(
              x,
              y,
              targetX,
              targetY
            );
            // Store the direct index (e.g., 252, 102, 50...) from the map
            updates.push({ x: x, y: y, index: localIndex });
          }
        }
      }
    }

    // Pass 2: Apply the calculated updates
    for (const update of updates) {
      // Use the direct index obtained from calculateGrassTileIndex
      const directIndex = update.index;
      if (directIndex !== null && directIndex !== 0) {
        // Check for null and unused index 0
        const globalIndex = firstGid + directIndex; // Add firstGid to the direct index
        this.grassLayer.putTileAt(globalIndex, update.x, update.y);
      } else {
        // If index is null (mask 0) or the unused index 0, remove the tile
        this.grassLayer.removeTileAt(update.x, update.y);
      }
    }
    console.log(`Finished applying ${updates.length} updates.`);
  }

  // --- TREE CUTTING METHODS ---

  /**
   * Performs a Breadth-First Search to find all connected tiles
   * starting from (startX, startY) on specified layers that have
   * a specific property set to true. Checks cardinal neighbors.
   *
   * @param startX The starting tile X coordinate.
   * @param startY The starting tile Y coordinate.
   * @param propertyName The name of the boolean property to check (e.g., 'stump' or 'tree').
   * @param layersToCheck An array of layer names to search within.
   * @returns An array of Phaser.Tilemaps.Tile objects found.
   */
  private findConnectedTiles(
    startX: number,
    startY: number,
    propertyName: string,
    layersToCheck: string[]
  ): Phaser.Tilemaps.Tile[] {
    const foundTiles: Phaser.Tilemaps.Tile[] = [];
    const queue: { x: number; y: number }[] = [];
    const visited: Set<string> = new Set(); // Store visited coordinates as "x,y"

    // Initial check for the start tile itself
    let startTileValid = false;
    for (const layerName of layersToCheck) {
      const layer = this.map.getLayer(layerName)?.tilemapLayer;
      if (layer) {
        const tile = layer.getTileAt(startX, startY);
        if (tile && tile.properties[propertyName] === true) {
          startTileValid = true;
          // Add the starting tile immediately if valid and not already added
          const key = `${startX},${startY}`;
          if (!visited.has(key)) {
            foundTiles.push(tile);
            visited.add(key);
          }
          // No need to check other layers for the *start* tile
          break;
        }
      }
    }

    // Only start the queue if the starting tile was valid
    if (!startTileValid) {
      console.log(
        `Starting tile [${startX}, ${startY}] does not have property ${propertyName}.`
      );
      return [];
    }

    queue.push({ x: startX, y: startY });
    // visited already contains the start key from above

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++]; // Dequeue

      // Explore neighbors (we already processed the 'current' tile when adding it to queue/foundTiles)
      const neighbors = [
        { x: current.x, y: current.y - 1 }, // N
        { x: current.x, y: current.y + 1 }, // S
        { x: current.x - 1, y: current.y }, // W
        { x: current.x + 1, y: current.y }, // E
      ];

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey); // Mark as visited immediately

          // Check if *any* layer at the neighbor location has the property
          let neighborTileToAdd: Phaser.Tilemaps.Tile | null = null;
          for (const layerName of layersToCheck) {
            const layer = this.map.getLayer(layerName)?.tilemapLayer;
            if (layer) {
              const neighborTile = layer.getTileAt(neighbor.x, neighbor.y);
              if (
                neighborTile &&
                neighborTile.properties[propertyName] === true
              ) {
                neighborTileToAdd = neighborTile; // Found the tile with the property
                break; // Found it on this layer, no need to check others for this coord
              }
            }
          }
          // If we found a valid tile, add it to queue and results
          if (neighborTileToAdd) {
            queue.push(neighbor);
            foundTiles.push(neighborTileToAdd);
          }
        }
      }
    } // End while loop

    console.log(
      `Found ${foundTiles.length} connected tiles with property '${propertyName}' starting from [${startX}, ${startY}]`
    );
    return foundTiles;
  }

  /**
   * Handles the logic for cutting down a tree connected to a starting stump tile.
   * @param initialStumpTile The stump tile adjacent to the player that was clicked near.
   */
  private cutTree(initialStumpTile: Phaser.Tilemaps.Tile): void {
    const layersToSearch = [
      // Define layers where stumps/trees can exist
      "Tile Layer 0",
      "Tile Layer 1",
      "Tile Layer 2",
      "Tile Layer 3",
      "Tile Layer 4",
      "Tile Layer 5",
      "Tile Layer -1",
      "Tile Layer -2",
    ];

    // 1. Find all connected stump tiles
    const stumpTiles = this.findConnectedTiles(
      initialStumpTile.x,
      initialStumpTile.y,
      "stump",
      layersToSearch
    );
    if (stumpTiles.length === 0) {
      console.warn(
        "Initial stump tile provided, but findConnectedTiles found none? Using initial tile."
      );
      // Ensure the initial tile itself is processed if findConnectedTiles fails unexpectedly
      if (initialStumpTile?.properties?.stump === true) {
        stumpTiles.push(initialStumpTile);
      } else {
        console.error("Initial stump tile doesn't actually have stump=true.");
        return; // Cannot proceed
      }
    }

    // 2. Find all unique tree tiles adjacent to any stump tile
    const allTreeTiles: Phaser.Tilemaps.Tile[] = [];
    const treeTilesSet: Set<string> = new Set(); // To track unique tree tiles by "x,y"
    const processedTreeStarts: Set<string> = new Set(); // Track starting tree tiles to avoid redundant BFS

    console.log(
      `Searching for trees adjacent to ${stumpTiles.length} stump tiles...`
    );
    for (const stump of stumpTiles) {
      const neighbors = [
        { x: stump.x, y: stump.y - 1 }, // N
        { x: stump.x, y: stump.y + 1 }, // S
        { x: stump.x - 1, y: stump.y }, // W
        { x: stump.x + 1, y: stump.y }, // E
        // Add diagonals if needed:
        // { x: stump.x + 1, y: stump.y - 1 }, // NE
        // { x: stump.x + 1, y: stump.y + 1 }, // SE
        // { x: stump.x - 1, y: stump.y + 1 }, // SW
        // { x: stump.x - 1, y: stump.y - 1 }, // NW
      ];

      for (const neighborCoord of neighbors) {
        // Check this neighbor coordinate across all layers for a tree tile
        for (const layerName of layersToSearch) {
          const layer = this.map.getLayer(layerName)?.tilemapLayer;
          if (layer) {
            const potentialTreeTile = layer.getTileAt(
              neighborCoord.x,
              neighborCoord.y
            );
            if (potentialTreeTile?.properties?.tree === true) {
              const treeStartKey = `${potentialTreeTile.x},${potentialTreeTile.y}`;
              // If we haven't started a search from this tree tile yet...
              if (!processedTreeStarts.has(treeStartKey)) {
                processedTreeStarts.add(treeStartKey); // Mark this starting point as processed
                console.log(
                  `Found tree start at [${treeStartKey}], searching connected group...`
                );
                // Find all connected tree parts starting from this one
                const connectedTreeGroup = this.findConnectedTiles(
                  potentialTreeTile.x,
                  potentialTreeTile.y,
                  "tree",
                  layersToSearch
                );
                // Add all found tree tiles to our master list and set
                for (const treeTile of connectedTreeGroup) {
                  const key = `${treeTile.x},${treeTile.y}`;
                  if (!treeTilesSet.has(key)) {
                    treeTilesSet.add(key);
                    allTreeTiles.push(treeTile);
                  }
                }
              }
              // Found a tree on this layer for this coord, no need to check other layers for same coord
              break;
            }
          }
        }
      }
    }

    if (allTreeTiles.length === 0) {
      console.log("Found stump but no adjacent/connected tree tiles.");
      // Mark the stump as 'cut' anyway, since the slice animation played
      stumpTiles.forEach((stump) => {
        if (stump.properties) stump.properties.cut = true;
        else stump.properties = { cut: true };
        console.log(
          `Marked stump at [${stump.x}, ${stump.y}] as cut (no tree found).`
        );
      });
      return;
    }

    console.log(
      `Found ${allTreeTiles.length} tree tiles connected to the stump area.`
    );

    // 3. Process Tree Tiles: Hide and set tree=false
    allTreeTiles.forEach((treeTile) => {
      if (treeTile) {
        treeTile.setVisible(false); // Hide the tile
        if (treeTile.properties) {
          treeTile.properties.tree = false; // Mark as not a tree anymore
        } else {
          treeTile.properties = { tree: false };
        }
        // Optional: Remove the tile completely?
        // treeTile.tilemapLayer.removeTileAt(treeTile.x, treeTile.y);
      }
    });

    // 4. Process Stump Tiles: Set cut=true
    stumpTiles.forEach((stump) => {
      if (stump.properties) {
        stump.properties.cut = true;
      } else {
        stump.properties = { cut: true };
      }
      console.log(`Marked stump at [${stump.x}, ${stump.y}] as cut.`);
    });
  } // End of cutTree

  // --- END TREE CUTTING METHODS ---

  // --- SOIL PLACEMENT METHODS ---

  /**
   * Checks if soil can be placed at the target coordinates.
   * Requires the target tile on layer 0 (grassLayer) to be empty (revealed dirt)
   * and all 8 surrounding tiles on layer 0 to also be empty.
   */
  private canPlaceSoil(targetX: number, targetY: number): boolean {
    if (!this.grassLayer) return false; // Need the grass layer (layer 0)

    // Check center tile
    if (this.grassLayer.getTileAt(targetX, targetY) !== null) {
      return false; // Center tile is not revealed dirt
    }

    // Check 8 neighbors
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip center
        if (this.grassLayer.getTileAt(targetX + dx, targetY + dy) !== null) {
          return false; // Neighbor is not revealed dirt
        }
      }
    }

    return true; // All conditions met
  }

  /**
   * Places a soil tile at the target coordinates on layer 1 (soilLayer)
   * and updates the borders of itself and its neighbors.
   */
  private placeSoilTile(targetX: number, targetY: number): void {
    console.log("PLACING SOIL TILE");
    if (!this.soilLayer) {
      console.error("Cannot place soil, soil layer is not initialized.");
      return;
    }
    const farmTileset = this.map.getTileset("Farm");
    if (!farmTileset) {
      console.error("Cannot place soil, 'Farm' tileset not found.");
      return;
    }

    // Place the base soil tile (adjust index by firstgid)
    const baseSoilIndex = this.SOIL_BASE + farmTileset.firstgid;
    this.soilLayer.putTileAt(baseSoilIndex, targetX, targetY);

    // Update borders for the new tile and its neighbors
    this.updateAdjacentBorder(targetX, targetY);
    this.updateAdjacentBorder(targetX, targetY - 1); // Above
    this.updateAdjacentBorder(targetX, targetY + 1); // Below
    this.updateAdjacentBorder(targetX - 1, targetY); // Left
    this.updateAdjacentBorder(targetX + 1, targetY); // Right
  }

  /**
   * Checks if a tile at given coordinates on the soil layer is a soil tile (base or border).
   * Note: Compares against the base tile IDs (e.g., 148), not the final index + firstgid.
   */
  private isBaseSoil(tileX: number, tileY: number): boolean {
    if (!this.soilLayer) return false;
    const tile = this.soilLayer.getTileAt(tileX, tileY);
    if (!tile || !tile.tileset) return false;

    // We need to compare the tile's base index (index - firstgid)
    // with our known soil IDs stored in the set.
    const baseIndex = tile.index - tile.tileset.firstgid;
    return baseIndex === this.SOIL_BASE;
  }

  /**
   * Updates the border of a single tile at (x, y) on the soil layer
   * based on whether its cardinal neighbors are also soil.
   */
  private updateAdjacentBorder(x: number, y: number): void {
    // Ensure layers exist
    if (!this.soilLayer || !this.grassLayer) {
      // console.log(`Border check: [${x},${y}] skipped, layers missing.`);
      return;
    }

    // 1. Check if the target tile (x, y) is suitable for placing a border.
    //    - Must be empty on grassLayer (Layer 0).
    //    - Must NOT be base soil on soilLayer (Layer 1).
    if (this.grassLayer.getTileAt(x, y) !== null) {
      // console.log(`Border check: [${x},${y}] skipped, grass layer not empty.`);
      return; // Cannot place border on top of grass/other layer 0 stuff
    }
    if (this.isBaseSoil(x, y)) {
      // console.log(`Border check: [${x},${y}] skipped, is already base soil.`);
      return; // Don't overwrite base soil with a border
    }

    const farmTileset = this.map.getTileset("Farm");
    if (!farmTileset) {
      console.error("Cannot update border, 'Farm' tileset not found.");
      return;
    }
    const firstgid = farmTileset.firstgid;

    // 2. Check cardinal neighbors FOR BASE SOIL
    const soilAbove = this.isBaseSoil(x, y - 1); // Is the tile ABOVE (x,y) base soil?
    const soilBelow = this.isBaseSoil(x, y + 1); // Is the tile BELOW (x,y) base soil?
    const soilLeft = this.isBaseSoil(x - 1, y); // Is the tile LEFT of (x,y) base soil?
    const soilRight = this.isBaseSoil(x + 1, y); // Is the tile RIGHT of (x,y) base soil?

    let borderBaseIndex: number | null = null; // Use null to indicate no border / remove tile

    // 3. Determine which border tile to place AT (x,y) based on adjacent soil.
    //    Check from most complex (4 neighbors) to least complex (1 neighbor).
    if (soilAbove && soilBelow && soilLeft && soilRight) {
      borderBaseIndex = this.SOIL_ALL; // All 4 sides
    } else if (soilAbove && soilBelow && soilLeft) {
      borderBaseIndex = this.SOIL_UDL; // Up + Down + Left
    } else if (soilAbove && soilBelow && soilRight) {
      borderBaseIndex = this.SOIL_UDR; // Up + Down + Right
    } else if (soilLeft && soilRight && soilAbove) {
      borderBaseIndex = this.SOIL_LRU; // Left + Right + Up
    } else if (soilLeft && soilRight && soilBelow) {
      borderBaseIndex = this.SOIL_LRD; // Left + Right + Down
    } else if (soilAbove && soilBelow) {
      borderBaseIndex = this.SOIL_UD; // Vertical Connector (Up + Down)
    } else if (soilLeft && soilRight) {
      borderBaseIndex = this.SOIL_LR; // Horizontal Connector (Left + Right)
      // --- NEW: Check for Inner Corners ---
    } else if (soilAbove && soilLeft) {
      borderBaseIndex = this.SOIL_CORNER_UL; // Soil is Up & Left of this tile
    } else if (soilAbove && soilRight) {
      borderBaseIndex = this.SOIL_CORNER_UR; // Soil is Up & Right of this tile
    } else if (soilBelow && soilLeft) {
      borderBaseIndex = this.SOIL_CORNER_DL; // Soil is Down & Left of this tile
    } else if (soilBelow && soilRight) {
      borderBaseIndex = this.SOIL_CORNER_DR; // Soil is Down & Right of this tile
      // --- End Inner Corner Check ---
    } else if (soilBelow) {
      // Placed UP border because soil is BELOW
      borderBaseIndex = this.SOIL_BORDER_UP;
    } else if (soilAbove) {
      // Place DOWN border because soil is ABOVE
      borderBaseIndex = this.SOIL_BORDER_DOWN;
    } else if (soilRight) {
      // Place LEFT border because soil is RIGHT
      borderBaseIndex = this.SOIL_BORDER_LEFT;
    } else if (soilLeft) {
      // Place RIGHT border because soil is LEFT
      borderBaseIndex = this.SOIL_BORDER_RIGHT;
    }
    // If none of the above conditions are met, borderBaseIndex remains null.

    // 4. Place or remove the border tile on the soilLayer
    if (borderBaseIndex !== null) {
      // console.log(`Placing border ${borderBaseIndex} at [${x},${y}]`);
      this.soilLayer.putTileAt(borderBaseIndex + firstgid, x, y);
    } else {
      // Only remove if it wasn't base soil (already checked above)
      // Check if the current tile is *any* known border tile before removing.
      const currentTile = this.soilLayer.getTileAt(x, y);
      if (currentTile && currentTile.tileset) {
        // Check tileset exists
        const currentBaseIndex =
          currentTile.index - currentTile.tileset.firstgid;
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
          // Add new corners to the check list
          this.SOIL_CORNER_UL,
          this.SOIL_CORNER_UR,
          this.SOIL_CORNER_DL,
          this.SOIL_CORNER_DR,
        ].includes(currentBaseIndex);

        if (isCurrentTileABorder) {
          // console.log(`Removing border at [${x},${y}]`);
          this.soilLayer.removeTileAt(x, y); // Remove if no adjacent soil and it *was* a border
        }
      }
    }
  }

  // --- GRASS AUTOTILING METHODS ---
} // End of MainScene class
