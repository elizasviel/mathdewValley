import "phaser";

// Define the structure for our selectable items
interface SelectableItem {
  id: string;
  name: string;
  frameIndex: number; // Frame index from the Farm spritesheet
}

export default class UIScene extends Phaser.Scene {
  private items: SelectableItem[] = [
    { id: "carrot", name: "Carrot", frameIndex: 26 },
    { id: "radish", name: "Radish", frameIndex: 76 },
    { id: "cabbage", name: "Cabbage", frameIndex: 126 },
    { id: "lettuce", name: "Lettuce", frameIndex: 176 },
    { id: "cauliflower", name: "Cauliflower", frameIndex: 226 },
    { id: "broccoli", name: "Broccoli", frameIndex: 276 },
    { id: "garlic", name: "Garlic", frameIndex: 326 },
    { id: "fertilizer", name: "Fertilizer", frameIndex: 42 },
  ];
  private selectedItemId: string = "carrot"; // State for the selected item
  private gridButtons: Phaser.GameObjects.Image[] = []; // Store button references
  private sfxButtonPress!: Phaser.Sound.BaseSound; // Sound effect for button press

  constructor() {
    super({ key: "UIScene", active: false });
  }

  preload() {
    // Load UI assets needed specifically for this scene
    this.load.image("ui_wood_flat", "UI_Wood_Flat.png");
    // Load the Farm spritesheet for icons
    this.load.spritesheet(
      "Farm",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Farm.png",
      { frameWidth: 16, frameHeight: 16 }
    );
    // Load the button press sound effect
    this.load.audio("buttonpress", "Sounds/buttonpress.mp3"); // Added sound load

    this.load.once("filecomplete-image-ui_wood_flat", () => {});
    this.load.once("loaderror-image-ui_wood_flat", (file: any) => {
      console.error("UIScene error loading ui_wood_flat.png:", file);
    });
  }

  create() {
    // Get screen dimensions
    const { width: screenWidth, height: screenHeight } = this.scale;

    // Initialize the sound effect
    this.sfxButtonPress = this.sound.add("buttonpress"); // Added sound initialization

    // Define margin from screen edges
    const margin = 0;

    // Calculate position for bottom-right corner
    const panelX = screenWidth - margin;
    const panelY = screenHeight - margin;

    const uiPanel = this.add.image(panelX, panelY, "ui_wood_flat");

    uiPanel.setCrop(0, 225, 160, 160);

    // Set origin to bottom-right for positioning
    uiPanel.setOrigin(0.71, 1);

    // Make the panel larger
    uiPanel.setScale(3);

    // Define button properties
    const buttonTexture = "ui_wood_flat";
    const buttonCropRect = { x: 161, y: 193, width: 48, height: 48 };
    const buttonScale = 3;
    const buttonOrigin = { x: 0.5, y: 0.5 };
    const hitAreaRect = new Phaser.Geom.Rectangle(164, 195, 40, 40); // Use the same hit area definition for consistency
    const hitAreaCallback = Phaser.Geom.Rectangle.Contains;
    this.gridButtons = []; // Clear previous buttons if scene restarts

    // Grid properties
    const gridRows = 3;
    const gridCols = 3;
    const buttonSpacing = 150; // Spacing between buttons (adjust as needed)
    const startX = panelX - uiPanel.displayWidth + 70; // Initial X position for the grid (user will adjust)
    const startY = panelY - uiPanel.displayHeight + 700; // Initial Y position for the grid (user will adjust)

    let itemIndex = 0; // To iterate through the items array

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (itemIndex >= this.items.length) {
          // Stop creating buttons if we've run out of items
          break;
        }

        const currentItem = this.items[itemIndex];
        const buttonX = startX + col * buttonSpacing;
        const buttonY = startY + row * buttonSpacing;

        // Add button using a specific frame from the texture
        const button = this.add.image(buttonX, buttonY, buttonTexture);
        button.setData("itemId", currentItem.id); // Store item id on the button

        // Set the specific frame for the button
        button.setCrop(
          buttonCropRect.x,
          buttonCropRect.y,
          buttonCropRect.width,
          buttonCropRect.height
        );

        // Apply the same scale as the panel
        button.setScale(buttonScale);

        // Adjust origin
        button.setOrigin(buttonOrigin.x, buttonOrigin.y);

        // Make the button interactive with the custom hit area
        button.setInteractive(hitAreaRect, hitAreaCallback);

        // --- Add Icon ---
        const iconOffsetX = 215; // Adjust as needed
        const iconOffsetY = 70; // Adjust as needed
        const icon = this.add.image(
          buttonX + iconOffsetX, // Add offset X
          buttonY + iconOffsetY, // Add offset Y
          "Farm", // Use the loaded Farm spritesheet
          currentItem.frameIndex // Use the frame index for this item
        );
        icon.setScale(5); // Scale icon similar to button maybe? Adjust if needed
        icon.setOrigin(0.5, 0.5); // Center the icon
        icon.setDepth(button.depth + 1); // Ensure icon is on top of the button

        // --- Event Listeners ---
        button.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.selectedItemId = currentItem.id;
          console.log(`Selected: ${currentItem.name}`);
          this.sfxButtonPress?.play(); // Play sound on click
          this.updateButtonVisuals();
          // TODO: Communicate selection back to MainScene if needed
        });

        button.on(Phaser.Input.Events.POINTER_OVER, () => {
          this.updateButtonVisuals(button); // Update visuals, highlighting this one for hover
        });

        button.on(Phaser.Input.Events.POINTER_OUT, () => {
          this.updateButtonVisuals(); // Update visuals, removing hover highlight
        });

        this.gridButtons.push(button); // Store the button reference
        itemIndex++;
      }
      if (itemIndex >= this.items.length) {
        break; // Break outer loop too
      }
    }
    this.updateButtonVisuals(); // Initial visual state update

    // Remove or comment out the global input debugging if it becomes too noisy
    // this.input.enableDebug(button); // Old line targeting a single button
  }

  // --- Helper function to update button appearance ---
  private updateButtonVisuals(
    hoveredButton: Phaser.GameObjects.Image | null = null
  ) {
    const normalTint = 0xffffff; // No tint
    const hoverTint = 0xcccccc; // Slightly darker
    const selectedTint = 0xaaffaa; // Light green
    const selectedHoverTint = 0x88dd88; // Darker green

    this.gridButtons.forEach((button) => {
      const itemId = button.getData("itemId") as string;
      const isSelected = itemId === this.selectedItemId;
      const isHovered = button === hoveredButton;

      button.clearTint(); // Reset tint first

      if (isSelected && isHovered) {
        button.setTint(selectedHoverTint);
      } else if (isSelected) {
        button.setTint(selectedTint);
      } else if (isHovered) {
        button.setTint(hoverTint);
      } else {
        button.setTint(normalTint); // Default state
      }
    });
  }

  // --- Public method to get selected item ---
  public getSelectedItemId(): string | null {
    return this.selectedItemId;
  }
}
