package com.deadlands.campaign.service;

import com.deadlands.campaign.dto.CombatStateResponse;
import com.deadlands.campaign.dto.InitiativeEntryDTO;
import com.deadlands.campaign.model.Character;
import com.deadlands.campaign.model.GameState;
import com.deadlands.campaign.model.InitiativeEntry;
import com.deadlands.campaign.repository.CharacterRepository;
import com.deadlands.campaign.repository.GameStateRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing Savage Worlds initiative (Action Cards).
 *
 * Implements the card-based initiative system:
 * - Each character is dealt one card at the start of each round
 * - Characters act in order from highest (Ace) to lowest (2)
 * - Suit order: Spades > Hearts > Diamonds > Clubs
 * - Jokers can act anytime and get +2 to all rolls
 */
@Service
public class InitiativeService {

    private static final Logger logger = LoggerFactory.getLogger(InitiativeService.class);

    // Card values for sorting (higher = acts first)
    private static final Map<String, Integer> CARD_VALUES = new LinkedHashMap<>();
    static {
        CARD_VALUES.put("A", 13);
        CARD_VALUES.put("K", 12);
        CARD_VALUES.put("Q", 11);
        CARD_VALUES.put("J", 10);
        CARD_VALUES.put("10", 9);
        CARD_VALUES.put("9", 8);
        CARD_VALUES.put("8", 7);
        CARD_VALUES.put("7", 6);
        CARD_VALUES.put("6", 5);
        CARD_VALUES.put("5", 4);
        CARD_VALUES.put("4", 3);
        CARD_VALUES.put("3", 2);
        CARD_VALUES.put("2", 1);
    }

    // Suit bonuses for tie-breaking (Spades highest)
    private static final Map<String, Integer> SUIT_BONUS = new LinkedHashMap<>();
    static {
        SUIT_BONUS.put("SPADES", 3);
        SUIT_BONUS.put("HEARTS", 2);
        SUIT_BONUS.put("DIAMONDS", 1);
        SUIT_BONUS.put("CLUBS", 0);
    }

    @Autowired
    private GameStateRepository gameStateRepository;

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private GameStateService gameStateService;

    /**
     * Create a shuffled deck of cards (52 + 2 Jokers).
     */
    private List<String[]> createDeck() {
        List<String[]> deck = new ArrayList<>();

        // Add regular cards
        for (String suit : SUIT_BONUS.keySet()) {
            for (String value : CARD_VALUES.keySet()) {
                deck.add(new String[]{value, suit});
            }
        }

        // Add Jokers
        deck.add(new String[]{"RED", "JOKER"});
        deck.add(new String[]{"BLACK", "JOKER"});

        // Shuffle
        Collections.shuffle(deck);

        return deck;
    }

    /**
     * Calculate the sort value for a card.
     * Higher value = acts first.
     */
    private int calculateSortValue(String value, String suit, boolean isJoker, boolean isRedJoker) {
        if (isJoker) {
            // Red Joker = 100, Black Joker = 99 (both are high and can act anytime)
            return isRedJoker ? 100 : 99;
        }

        // Regular cards: (value * 4) + suitBonus
        int cardValue = CARD_VALUES.getOrDefault(value, 0);
        int suitBonus = SUIT_BONUS.getOrDefault(suit, 0);
        return (cardValue * 4) + suitBonus;
    }

    /**
     * Start combat with the given characters.
     * Deals initiative cards to all participants.
     *
     * @param playerCharacterIds List of player character IDs
     * @param npcNames List of NPC/enemy names
     * @return Combat state with initiative order
     */
    @Transactional
    public CombatStateResponse startCombat(List<Long> playerCharacterIds, List<String> npcNames) {
        logger.info("[InitiativeService] Starting combat with {} players and {} NPCs",
                playerCharacterIds != null ? playerCharacterIds.size() : 0,
                npcNames != null ? npcNames.size() : 0);

        GameState gameState = gameStateService.getOrCreateGameState();

        // Clear any existing combat state
        gameState.endCombat();

        // Start fresh combat
        gameState.startCombat();

        // Create deck and deal cards
        List<String[]> deck = createDeck();
        int cardIndex = 0;
        boolean jokerDealt = false;

        // Deal to player characters
        if (playerCharacterIds != null) {
            for (Long characterId : playerCharacterIds) {
                Optional<Character> charOpt = characterRepository.findById(characterId);
                if (charOpt.isPresent()) {
                    Character character = charOpt.get();
                    String[] card = deck.get(cardIndex++);
                    InitiativeEntry entry = createInitiativeEntry(
                            characterId,
                            character.getName(),
                            true,
                            card
                    );
                    gameState.addInitiativeEntry(entry);

                    if (entry.isJoker()) {
                        jokerDealt = true;
                    }

                    logger.debug("[InitiativeService] Dealt {} of {} to {}",
                            card[0], card[1], character.getName());
                }
            }
        }

        // Deal to NPCs
        if (npcNames != null) {
            for (String npcName : npcNames) {
                String[] card = deck.get(cardIndex++);
                InitiativeEntry entry = createInitiativeEntry(
                        null,  // NPCs don't have character IDs
                        npcName,
                        false,
                        card
                );
                gameState.addInitiativeEntry(entry);

                if (entry.isJoker()) {
                    jokerDealt = true;
                }

                logger.debug("[InitiativeService] Dealt {} of {} to NPC {}",
                        card[0], card[1], npcName);
            }
        }

        gameState.setJokerDealtThisRound(jokerDealt);

        // Sort initiative order and assign turn numbers
        List<InitiativeEntry> sorted = gameState.getInitiativeOrder().stream()
                .sorted((a, b) -> Integer.compare(b.getSortValue(), a.getSortValue()))
                .collect(Collectors.toList());

        int turnOrder = 1;
        for (InitiativeEntry entry : sorted) {
            entry.setTurnOrder(turnOrder++);
        }

        // Set first character as active
        InitiativeEntry first = gameState.getNextToAct();
        if (first != null) {
            gameState.setActiveCharacterId(first.getCharacterId());
        }

        // Save
        gameStateRepository.save(gameState);

        logger.info("[InitiativeService] Combat started! Round {} with {} combatants",
                gameState.getRoundNumber(), gameState.getInitiativeOrder().size());

        return buildCombatStateResponse(gameState, "Combat started! Round " + gameState.getRoundNumber());
    }

    /**
     * Create an InitiativeEntry from a dealt card.
     */
    private InitiativeEntry createInitiativeEntry(Long characterId, String name, boolean isPlayer, String[] card) {
        String value = card[0];
        String suit = card[1];
        boolean isJoker = "JOKER".equals(suit);
        boolean isRedJoker = isJoker && "RED".equals(value);

        int sortValue = calculateSortValue(value, suit, isJoker, isRedJoker);

        return InitiativeEntry.builder()
                .characterId(characterId)
                .characterName(name)
                .isPlayer(isPlayer)
                .cardValue(value)
                .cardSuit(isJoker ? null : suit)
                .isJoker(isJoker)
                .isRedJoker(isRedJoker)
                .sortValue(sortValue)
                .hasActed(false)
                .turnOrder(0)  // Will be set after sorting
                .build();
    }

    /**
     * End the current character's turn and advance to the next.
     * If all characters have acted, automatically starts a new round.
     *
     * @param characterId The character ending their turn (for validation)
     * @return Updated combat state
     */
    @Transactional
    public CombatStateResponse endTurn(Long characterId) {
        GameState gameState = gameStateService.getOrCreateGameState();

        if (!Boolean.TRUE.equals(gameState.getCombatActive())) {
            return buildCombatStateResponse(gameState, "Combat is not active");
        }

        // Mark current character as having acted
        Optional<InitiativeEntry> currentEntry = gameState.getInitiativeOrder().stream()
                .filter(e -> Objects.equals(e.getCharacterId(), characterId) ||
                        (characterId == null && e.getCharacterId() == null))
                .findFirst();

        if (currentEntry.isPresent()) {
            currentEntry.get().setHasActed(true);
            logger.info("[InitiativeService] {} ended their turn", currentEntry.get().getCharacterName());
        }

        // Check if all characters have acted
        if (gameState.allCharactersActed()) {
            // Start new round
            return startNewRound(gameState);
        }

        // Advance to next character
        InitiativeEntry next = gameState.getNextToAct();
        if (next != null) {
            gameState.setActiveCharacterId(next.getCharacterId());
            gameStateRepository.save(gameState);

            logger.info("[InitiativeService] It's now {}'s turn", next.getCharacterName());
            return buildCombatStateResponse(gameState, next.getCharacterName() + "'s turn!");
        }

        gameStateRepository.save(gameState);
        return buildCombatStateResponse(gameState, "Turn ended");
    }

    /**
     * Start a new round - deal new cards to everyone.
     */
    @Transactional
    public CombatStateResponse startNewRound(GameState gameState) {
        logger.info("[InitiativeService] Starting new round (was round {})", gameState.getRoundNumber());

        // Get all participants from current round
        List<Long> playerIds = gameState.getInitiativeOrder().stream()
                .filter(InitiativeEntry::isPlayer)
                .map(InitiativeEntry::getCharacterId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<String> npcNames = gameState.getInitiativeOrder().stream()
                .filter(e -> !e.isPlayer())
                .map(InitiativeEntry::getCharacterName)
                .collect(Collectors.toList());

        // Advance round number
        gameState.nextRound();

        // Deal new cards
        List<String[]> deck = createDeck();
        int cardIndex = 0;
        boolean jokerDealt = false;

        // Re-deal to players
        for (Long playerId : playerIds) {
            Optional<Character> charOpt = characterRepository.findById(playerId);
            if (charOpt.isPresent()) {
                String[] card = deck.get(cardIndex++);
                InitiativeEntry entry = createInitiativeEntry(
                        playerId,
                        charOpt.get().getName(),
                        true,
                        card
                );
                gameState.addInitiativeEntry(entry);
                if (entry.isJoker()) jokerDealt = true;
            }
        }

        // Re-deal to NPCs
        for (String npcName : npcNames) {
            String[] card = deck.get(cardIndex++);
            InitiativeEntry entry = createInitiativeEntry(null, npcName, false, card);
            gameState.addInitiativeEntry(entry);
            if (entry.isJoker()) jokerDealt = true;
        }

        gameState.setJokerDealtThisRound(jokerDealt);

        // Sort and assign turn order
        List<InitiativeEntry> sorted = gameState.getInitiativeOrder().stream()
                .sorted((a, b) -> Integer.compare(b.getSortValue(), a.getSortValue()))
                .collect(Collectors.toList());

        int turnOrder = 1;
        for (InitiativeEntry entry : sorted) {
            entry.setTurnOrder(turnOrder++);
        }

        // Set first character as active
        InitiativeEntry first = gameState.getNextToAct();
        if (first != null) {
            gameState.setActiveCharacterId(first.getCharacterId());
        }

        gameStateRepository.save(gameState);

        logger.info("[InitiativeService] Round {} started!", gameState.getRoundNumber());
        return buildCombatStateResponse(gameState, "Round " + gameState.getRoundNumber() + " begins!");
    }

    /**
     * End combat entirely.
     */
    @Transactional
    public CombatStateResponse endCombat() {
        GameState gameState = gameStateService.getOrCreateGameState();
        gameState.endCombat();
        gameStateRepository.save(gameState);

        logger.info("[InitiativeService] Combat ended");
        return buildCombatStateResponse(gameState, "Combat ended");
    }

    /**
     * Get current combat state.
     */
    public CombatStateResponse getCombatState() {
        GameState gameState = gameStateService.getOrCreateGameState();
        return buildCombatStateResponse(gameState, null);
    }

    /**
     * Build a CombatStateResponse from GameState.
     */
    private CombatStateResponse buildCombatStateResponse(GameState gameState, String message) {
        List<InitiativeEntryDTO> initiativeOrder = gameState.getInitiativeOrder().stream()
                .sorted((a, b) -> Integer.compare(b.getSortValue(), a.getSortValue()))
                .map(this::toDTO)
                .collect(Collectors.toList());

        // Find active character name
        String activeCharacterName = null;
        if (gameState.getActiveCharacterId() != null) {
            activeCharacterName = gameState.getInitiativeOrder().stream()
                    .filter(e -> Objects.equals(e.getCharacterId(), gameState.getActiveCharacterId()))
                    .map(InitiativeEntry::getCharacterName)
                    .findFirst()
                    .orElse(null);
        }

        return CombatStateResponse.builder()
                .roundNumber(gameState.getRoundNumber() != null ? gameState.getRoundNumber() : 1)
                .combatActive(Boolean.TRUE.equals(gameState.getCombatActive()))
                .activeCharacterId(gameState.getActiveCharacterId())
                .activeCharacterName(activeCharacterName)
                .initiativeOrder(initiativeOrder)
                .jokerDealt(Boolean.TRUE.equals(gameState.getJokerDealtThisRound()))
                .message(message)
                .build();
    }

    /**
     * Convert InitiativeEntry entity to DTO.
     */
    private InitiativeEntryDTO toDTO(InitiativeEntry entry) {
        return InitiativeEntryDTO.builder()
                .characterId(entry.getCharacterId())
                .characterName(entry.getCharacterName())
                .isPlayer(entry.isPlayer())
                .cardSuit(entry.getCardSuit())
                .cardValue(entry.getCardValue())
                .isJoker(entry.isJoker())
                .isRedJoker(entry.isRedJoker())
                .sortValue(entry.getSortValue())
                .hasActed(entry.isHasActed())
                .isActive(Objects.equals(entry.getCharacterId(),
                        entry.getGameState().getActiveCharacterId()))
                .build();
    }

    /**
     * Add a character to active combat (e.g., reinforcements).
     */
    @Transactional
    public CombatStateResponse addCombatant(Long characterId, String npcName, boolean isPlayer) {
        GameState gameState = gameStateService.getOrCreateGameState();

        if (!Boolean.TRUE.equals(gameState.getCombatActive())) {
            return buildCombatStateResponse(gameState, "Combat is not active");
        }

        // Deal a card
        List<String[]> deck = createDeck();
        String[] card = deck.get(0);

        String name = npcName;
        if (isPlayer && characterId != null) {
            Optional<Character> charOpt = characterRepository.findById(characterId);
            if (charOpt.isPresent()) {
                name = charOpt.get().getName();
            }
        }

        InitiativeEntry entry = createInitiativeEntry(characterId, name, isPlayer, card);

        // Set turn order to end of current order
        int maxTurnOrder = gameState.getInitiativeOrder().stream()
                .mapToInt(InitiativeEntry::getTurnOrder)
                .max()
                .orElse(0);
        entry.setTurnOrder(maxTurnOrder + 1);

        gameState.addInitiativeEntry(entry);

        if (entry.isJoker()) {
            gameState.setJokerDealtThisRound(true);
        }

        gameStateRepository.save(gameState);

        logger.info("[InitiativeService] Added {} to combat with {} of {}",
                name, card[0], card[1]);
        return buildCombatStateResponse(gameState, name + " joins the fight!");
    }

    /**
     * Remove a character from combat (death, fled, etc.).
     */
    @Transactional
    public CombatStateResponse removeCombatant(Long characterId, String npcName) {
        GameState gameState = gameStateService.getOrCreateGameState();

        if (!Boolean.TRUE.equals(gameState.getCombatActive())) {
            return buildCombatStateResponse(gameState, "Combat is not active");
        }

        // Find and remove
        Optional<InitiativeEntry> toRemove = gameState.getInitiativeOrder().stream()
                .filter(e -> (characterId != null && Objects.equals(e.getCharacterId(), characterId)) ||
                        (npcName != null && npcName.equals(e.getCharacterName())))
                .findFirst();

        if (toRemove.isPresent()) {
            String name = toRemove.get().getCharacterName();
            gameState.getInitiativeOrder().remove(toRemove.get());

            // If this was the active character, advance to next
            if (Objects.equals(gameState.getActiveCharacterId(), toRemove.get().getCharacterId())) {
                InitiativeEntry next = gameState.getNextToAct();
                gameState.setActiveCharacterId(next != null ? next.getCharacterId() : null);
            }

            gameStateRepository.save(gameState);
            logger.info("[InitiativeService] Removed {} from combat", name);
            return buildCombatStateResponse(gameState, name + " is out of the fight!");
        }

        return buildCombatStateResponse(gameState, "Combatant not found");
    }
}
