import "phaser";

export default class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;

  constructor() {
    super("main");
  }

  preload() {
    // Load the tilemap
    this.load.tilemapTiledJSON("map", "map.tmj");

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
    this.load.image(
      "Farm",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Farm.png"
    );
    // Add the missing Shadows tileset
    this.load.image(
      "Shadows",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Shadows.png"
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

    for (const layer of this.map.layers) {
      try {
        const createdLayer = this.map.createLayer(layer.name, tilesets, 0, 0);
        if (createdLayer) {
          layersCreated.push(layer.name);
          console.log(`Successfully created layer: ${layer.name}`);

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

    // Add a camera controller
    const cursors = this.input.keyboard?.createCursorKeys();
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors?.left,
      right: cursors?.right,
      up: cursors?.up,
      down: cursors?.down,
      acceleration: 0.06,
      drag: 0.0005,
      maxSpeed: 1.0,
    };

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.setZoom(3); // Adjust zoom for better viewing

    // Add camera controls
    const controls = new Phaser.Cameras.Controls.SmoothedKeyControl(
      controlConfig
    );

    // Store controls in scene for update loop
    (this as any).controls = controls;

    // Add debug information
    console.log(`Map dimensions: ${this.map.width}x${this.map.height}`);
    console.log(`Total layers: ${this.map.layers.length}`);
    console.log(
      `Created layers: ${layersCreated.length}/${this.map.layers.length}`
    );
    console.log(
      `Loaded tilesets: ${tilesets.length}/${this.map.tilesets.length}`
    );
    console.log("Use arrow keys to navigate the map");
  }

  update(time: number, delta: number) {
    // Update camera controls
    const controls = (this as any).controls;
    if (controls) {
      controls.update(delta);
    }
  }
}
