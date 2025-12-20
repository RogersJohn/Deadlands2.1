package com.deadlands.campaign.service;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for AI-powered Game Master assistance using Claude AI
 * Provides NPC dialogue, encounter generation, rule lookups, and location generation
 */
@Service
@Slf4j
public class AIGameMasterService {

    private final AnthropicChatModel chatModel;

    public AIGameMasterService(AnthropicChatModel chatModel) {
        this.chatModel = chatModel;
    }

    /**
     * Generate NPC dialogue based on character personality and context
     *
     * @param npcName Name of the NPC
     * @param npcPersonality Personality traits or role description
     * @param context Current situation or scene context
     * @param playerQuestion What the player asked or said
     * @return AI-generated NPC response in character
     */
    public String generateNPCDialogue(String npcName, String npcPersonality, String context, String playerQuestion) {
        log.info("Generating NPC dialogue for '{}' in response to: {}", npcName, playerQuestion);

        String systemPrompt = """
            You are a Game Master for a Deadlands Reloaded campaign, roleplaying as %s.

            NPC Profile: %s

            Current Context: %s

            The player says or asks: "%s"

            Respond in character as %s. Keep your response concise (2-4 sentences), authentic to the Weird West setting,
            and appropriate to the NPC's personality. Use Western dialect where appropriate.
            """.formatted(npcName, npcPersonality, context, playerQuestion, npcName);

        return callClaude(systemPrompt);
    }

    /**
     * Generate a random encounter based on location and party level
     *
     * @param location Where the encounter takes place
     * @param partySize Number of player characters
     * @param averageLevel Average party level (Novice, Seasoned, Veteran, Heroic, Legendary)
     * @return JSON-formatted encounter with enemies, description, and tactics
     */
    public String generateEncounter(String location, int partySize, String averageLevel) {
        log.info("Generating {} encounter for party of {} at location: {}", averageLevel, partySize, location);

        String prompt = """
            Generate a Deadlands Reloaded encounter for a %s rank party of %d characters at this location: %s.

            Include:
            1. Encounter description (2-3 sentences setting the scene)
            2. Enemy types and numbers (balanced for the party)
            3. Enemy tactics (how they fight)
            4. Potential rewards or loot
            5. Any environmental hazards or special rules

            Format the response as JSON with keys: description, enemies (array), tactics, rewards, hazards.
            Make it authentic to the Weird West Deadlands setting.
            """.formatted(averageLevel, partySize, location);

        return callClaude(prompt);
    }

    /**
     * Look up Savage Worlds or Deadlands rules
     *
     * @param ruleQuestion The rule question from the player or GM
     * @return Explanation of the rule with examples
     */
    public String lookupRule(String ruleQuestion) {
        log.info("Looking up rule: {}", ruleQuestion);

        String prompt = """
            You are an expert on Savage Worlds Adventure Edition and Deadlands Reloaded rules.

            Question: %s

            Provide a clear, concise explanation of the rule. Include:
            1. The core mechanic (how it works)
            2. Any modifiers or special cases
            3. A practical example
            4. Page reference if you know it (format: "SWADE p.XX" or "Deadlands p.XX")

            Keep it under 150 words.
            """.formatted(ruleQuestion);

        return callClaude(prompt);
    }

    /**
     * Generate a Weird West location with NPCs and plot hooks
     *
     * @param locationType Type of location (town, mine, ranch, fort, etc.)
     * @param size Small, Medium, or Large
     * @return Detailed location description with NPCs and hooks
     */
    public String generateLocation(String locationType, String size) {
        log.info("Generating {} {} location", size, locationType);

        String prompt = """
            Generate a %s-sized %s for a Deadlands Reloaded campaign in the Weird West (1876-1879).

            Include:
            1. Location name and 2-3 sentence description
            2. 3-5 notable NPCs with names, roles, and brief personality notes
            3. 2-3 plot hooks or adventure seeds
            4. Any supernatural or unusual elements (this is Deadlands!)
            5. Local threats or challenges

            Make it vivid, gameable, and true to the Deadlands weird west horror setting.
            """.formatted(size, locationType);

        return callClaude(prompt);
    }

    /**
     * Generate suggestions for the GM based on current game state
     *
     * @param situation Description of the current situation
     * @return GM suggestions for interesting developments
     */
    public String generateGMSuggestion(String situation) {
        log.info("Generating GM suggestion for situation");

        String prompt = """
            You are an experienced Deadlands Game Master. The party is in this situation:

            %s

            Provide 3-4 interesting developments, complications, or twists the GM could introduce.
            Make them specific to Deadlands (horror, weird science, supernatural elements).
            Keep it concise (bullet points).
            """.formatted(situation);

        return callClaude(prompt);
    }

    /**
     * Generate a tactical battle map with terrain, buildings, and NPCs
     *
     * @param locationType Type of location (wilderness, town, interior, mine, fort)
     * @param size Map size (small, medium, large)
     * @param theme Battle theme (combat, chase, ambush, siege)
     * @param features List of features to include (water, buildings, cover, elevation)
     * @param description Optional additional details
     * @return JSON string with map data
     */
    public String generateBattleMap(String locationType, String size, String theme,
                                   java.util.List<String> features, String description) {
        log.info("Generating {} {} battle map with theme: {}", size, locationType, theme);

        // Determine grid size based on size parameter
        String gridSize = switch (size.toLowerCase()) {
            case "small" -> "15x10 tiles";
            case "large" -> "50x30 tiles";
            default -> "30x20 tiles"; // medium
        };

        int gridWidth = switch (size.toLowerCase()) {
            case "small" -> 15;
            case "large" -> 50;
            default -> 30;
        };

        int gridHeight = switch (size.toLowerCase()) {
            case "small" -> 10;
            case "large" -> 30;
            default -> 20;
        };

        String featuresStr = features != null && !features.isEmpty()
            ? String.join(", ", features)
            : "standard terrain";

        String additionalDetails = description != null && !description.isEmpty()
            ? "\n\nAdditional GM requirements: " + description
            : "";

        String prompt = String.format("""
            Generate a tactical battle map for Deadlands Reloaded (Weird West tabletop RPG).

            **Location Type:** %s
            **Grid Size:** %s (%dx%d tiles)
            **Battle Theme:** %s
            **Features to Include:** %s%s

            Return ONLY valid JSON (no markdown, no code blocks, no explanations) with this exact structure:

            {
              "name": "Evocative map name",
              "description": "2-3 sentence tactical description highlighting chokepoints, cover, and key features",
              "size": {
                "width": %d,
                "height": %d
              },
              "terrain": [
                {
                  "type": "dirt",
                  "area": {"x1": 0, "y1": 0, "x2": 29, "y2": 19}
                },
                {
                  "type": "rocks",
                  "area": {"x1": 5, "y1": 3, "x2": 10, "y2": 7}
                }
              ],
              "buildings": [
                {
                  "name": "Building name",
                  "type": "saloon",
                  "position": {"x": 10, "y": 5},
                  "size": {"width": 6, "height": 4},
                  "wallTerrain": "wood_wall",
                  "floorTerrain": "wood_floor",
                  "entrances": [
                    {"x": 13, "y": 5, "direction": "north"}
                  ]
                }
              ],
              "npcs": [],
              "cover": [
                {
                  "type": "barrel",
                  "position": {"x": 8, "y": 10},
                  "coverBonus": 2,
                  "size": "small"
                }
              ]
            }

            **TERRAIN TYPES:** dirt, rocks, water, grass, sand, wood_floor, stone_floor, wood_wall, stone_wall
            **BUILDING TYPES:** saloon, house, barn, mine, fort, church, store, hotel, bank
            **COVER TYPES:** barrel, crate, wagon, fence, water_trough, stack_of_hay
            **COVER BONUSES:** Light cover = 2, Medium cover = 4, Heavy cover = 6

            **IMPORTANT - TERRAIN FORMAT:**
            Use rectangular "area" objects (x1,y1,x2,y2) NOT coordinate arrays!
            Example: {"type": "dirt", "area": {"x1": 0, "y1": 0, "x2": 29, "y2": 19}}
            This defines a filled rectangle from (0,0) to (29,19).
            Use overlapping areas to create varied terrain (later areas override earlier ones).

            **REQUIREMENTS:**
            - Create a tactically interesting map with varied terrain
            - Include chokepoints, flanking routes, and defensive positions
            - Place cover strategically for dynamic combat (max 10-15 cover objects)
            - Ensure buildings have proper entrances
            - Make it thematic to Deadlands Weird West (1870s horror western)
            - For town maps: include 3-6 buildings
            - For wilderness: 3-5 varied terrain regions
            - For combat theme: lots of cover and tactical positions
            - For chase theme: open spaces with obstacles
            - For ambush theme: asymmetric layout with hiding spots
            - Keep terrain areas to 5-8 regions maximum for efficiency
            - DO NOT generate NPCs - leave the "npcs" array EMPTY []
            - Limit buildings to 3-6 structures

            Generate the JSON now. Return ONLY the JSON object, no other text.
            """,
            locationType,
            gridSize,
            gridWidth,
            gridHeight,
            theme,
            featuresStr,
            additionalDetails,
            gridWidth,
            gridHeight
        );

        return callClaude(prompt);
    }

    /**
     * Generate an image prompt for Stable Diffusion based on map data
     *
     * @param mapName Name of the map
     * @param locationType Type of location
     * @param description Map description
     * @return Optimized prompt for image generation
     */
    public String generateImagePrompt(String mapName, String locationType, String description) {
        return String.format(
            "%s: %s, %s location, top-down view, battle map, Old West 1870s, " +
            "dusty terrain, wooden buildings, rocky outcrops, Western frontier town, " +
            "Deadlands RPG style, clear details, high contrast",
            mapName,
            description,
            locationType
        );
    }

    /**
     * Call Claude AI with a prompt and return the response
     *
     * @param promptText The full prompt to send to Claude
     * @return Claude's text response
     */
    private String callClaude(String promptText) {
        try {
            UserMessage userMessage = new UserMessage(promptText);
            Prompt prompt = new Prompt(userMessage);
            ChatResponse response = chatModel.call(prompt);

            String content = response.getResult().getOutput().getContent();
            log.debug("Claude response: {}", content);
            return content;

        } catch (Exception e) {
            log.error("Error calling Claude AI: {}", e.getMessage(), e);
            return "Error: Unable to generate AI response. Please check your API key and try again.";
        }
    }
}
