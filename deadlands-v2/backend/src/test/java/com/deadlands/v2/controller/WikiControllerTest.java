package com.deadlands.v2.controller;

import com.deadlands.v2.dto.CreateWikiEntryRequest;
import com.deadlands.v2.dto.GrantAccessRequest;
import com.deadlands.v2.dto.RegisterRequest;
import com.deadlands.v2.dto.UpdateWikiEntryRequest;
import com.deadlands.v2.entity.*;
import com.deadlands.v2.repository.UserRepository;
import com.deadlands.v2.repository.WikiAccessRepository;
import com.deadlands.v2.repository.WikiEntryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WikiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WikiEntryRepository wikiEntryRepository;

    @Autowired
    private WikiAccessRepository wikiAccessRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User gmUser;
    private User playerUser;
    private String gmToken;
    private String playerToken;

    @BeforeEach
    void setUp() throws Exception {
        wikiAccessRepository.deleteAll();
        wikiEntryRepository.deleteAll();
        userRepository.deleteAll();

        // Create GM user
        gmUser = new User("gamemaster", passwordEncoder.encode("password123"), "gm@example.com", Role.GAME_MASTER);
        gmUser = userRepository.save(gmUser);

        // Create Player user
        playerUser = new User("player1", passwordEncoder.encode("password123"), "player@example.com", Role.PLAYER);
        playerUser = userRepository.save(playerUser);

        // Get tokens
        gmToken = getToken("gamemaster", "password123");
        playerToken = getToken("player1", "password123");
    }

    private String getToken(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("accessToken").asText();
    }

    private WikiEntry createPublicWikiEntry(String title, String slug) {
        WikiEntry entry = new WikiEntry(title, slug, "# " + title + "\n\nContent here", WikiCategory.CAMPAIGN_LORE, WikiVisibility.PUBLIC);
        entry.setCreatedBy(gmUser);
        return wikiEntryRepository.save(entry);
    }

    private WikiEntry createPrivateWikiEntry(String title, String slug) {
        WikiEntry entry = new WikiEntry(title, slug, "# Secret\n\nPrivate content", WikiCategory.CAMPAIGN_LORE, WikiVisibility.PRIVATE);
        entry.setCreatedBy(gmUser);
        return wikiEntryRepository.save(entry);
    }

    // ==================== GET ALL ENTRIES ====================

    @Test
    void getAllEntries_AsPlayer_ReturnsOnlyVisibleEntries() throws Exception {
        createPublicWikiEntry("Public Entry", "public-entry");
        createPrivateWikiEntry("Private Entry", "private-entry");

        mockMvc.perform(get("/api/wiki")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Public Entry"));
    }

    @Test
    void getAllEntries_AsGM_ReturnsAllEntries() throws Exception {
        createPublicWikiEntry("Public Entry", "public-entry");
        createPrivateWikiEntry("Private Entry", "private-entry");

        mockMvc.perform(get("/api/wiki")
                        .header("Authorization", "Bearer " + gmToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void getAllEntries_WithoutAuth_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/wiki"))
                .andExpect(status().isUnauthorized());
    }

    // ==================== GET BY SLUG ====================

    @Test
    void getBySlug_PublicEntry_ReturnsEntry() throws Exception {
        WikiEntry entry = createPublicWikiEntry("Test Entry", "test-entry");

        mockMvc.perform(get("/api/wiki/slug/test-entry")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Entry"))
                .andExpect(jsonPath("$.slug").value("test-entry"))
                .andExpect(jsonPath("$.category").value("CAMPAIGN_LORE"));
    }

    @Test
    void getBySlug_PrivateEntry_AsPlayer_ReturnsForbidden() throws Exception {
        createPrivateWikiEntry("Secret Entry", "secret-entry");

        mockMvc.perform(get("/api/wiki/slug/secret-entry")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void getBySlug_PrivateEntry_AsGM_ReturnsEntry() throws Exception {
        createPrivateWikiEntry("Secret Entry", "secret-entry");

        mockMvc.perform(get("/api/wiki/slug/secret-entry")
                        .header("Authorization", "Bearer " + gmToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Secret Entry"));
    }

    @Test
    void getBySlug_NonExistent_ReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/wiki/slug/non-existent")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isNotFound());
    }

    // ==================== GET BY CATEGORY ====================

    @Test
    void getByCategory_ReturnsFilteredEntries() throws Exception {
        createPublicWikiEntry("Lore Entry", "lore-entry");

        WikiEntry locationEntry = new WikiEntry("Location", "location-entry", "Content", WikiCategory.LOCATION, WikiVisibility.PUBLIC);
        locationEntry.setCreatedBy(gmUser);
        wikiEntryRepository.save(locationEntry);

        mockMvc.perform(get("/api/wiki/category/CAMPAIGN_LORE")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].category").value("CAMPAIGN_LORE"));
    }

    // ==================== SEARCH ====================

    @Test
    void search_FindsMatchingEntries() throws Exception {
        createPublicWikiEntry("The Railroad Wars", "railroad-wars");
        createPublicWikiEntry("Ghost Rock Mining", "ghost-rock");

        mockMvc.perform(get("/api/wiki/search")
                        .param("query", "railroad")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("The Railroad Wars"));
    }

    @Test
    void search_WithCategory_FiltersCorrectly() throws Exception {
        WikiEntry loreEntry = new WikiEntry("Railroad Lore", "railroad-lore", "Content", WikiCategory.CAMPAIGN_LORE, WikiVisibility.PUBLIC);
        loreEntry.setCreatedBy(gmUser);
        wikiEntryRepository.save(loreEntry);

        WikiEntry locationEntry = new WikiEntry("Railroad Station", "railroad-station", "Content", WikiCategory.LOCATION, WikiVisibility.PUBLIC);
        locationEntry.setCreatedBy(gmUser);
        wikiEntryRepository.save(locationEntry);

        mockMvc.perform(get("/api/wiki/search")
                        .param("query", "railroad")
                        .param("category", "CAMPAIGN_LORE")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].category").value("CAMPAIGN_LORE"));
    }

    // ==================== CREATE ENTRY ====================

    @Test
    void createEntry_AsGM_CreatesSuccessfully() throws Exception {
        CreateWikiEntryRequest request = new CreateWikiEntryRequest();
        request.setTitle("New Wiki Entry");
        request.setContent("# New Entry\n\nSome markdown content");
        request.setCategory(WikiCategory.CAMPAIGN_LORE);
        request.setVisibility(WikiVisibility.PUBLIC);

        mockMvc.perform(post("/api/wiki")
                        .header("Authorization", "Bearer " + gmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("New Wiki Entry"))
                .andExpect(jsonPath("$.slug").value("new-wiki-entry"))
                .andExpect(jsonPath("$.category").value("CAMPAIGN_LORE"));

        assertEquals(1, wikiEntryRepository.count());
    }

    @Test
    void createEntry_AsPlayer_ReturnsForbidden() throws Exception {
        CreateWikiEntryRequest request = new CreateWikiEntryRequest();
        request.setTitle("Player Wiki Entry");
        request.setContent("Content");
        request.setCategory(WikiCategory.CAMPAIGN_LORE);

        mockMvc.perform(post("/api/wiki")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createEntry_WithCustomSlug_UsesProvidedSlug() throws Exception {
        CreateWikiEntryRequest request = new CreateWikiEntryRequest();
        request.setTitle("Custom Slug Entry");
        request.setSlug("my-custom-slug");
        request.setContent("Content");
        request.setCategory(WikiCategory.CAMPAIGN_LORE);

        mockMvc.perform(post("/api/wiki")
                        .header("Authorization", "Bearer " + gmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("my-custom-slug"));
    }

    @Test
    void createEntry_WithMissingTitle_ReturnsValidationError() throws Exception {
        CreateWikiEntryRequest request = new CreateWikiEntryRequest();
        request.setContent("Content without title");

        mockMvc.perform(post("/api/wiki")
                        .header("Authorization", "Bearer " + gmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
    }

    // ==================== UPDATE ENTRY ====================

    @Test
    void updateEntry_AsGM_UpdatesSuccessfully() throws Exception {
        WikiEntry entry = createPublicWikiEntry("Original Title", "original-slug");

        UpdateWikiEntryRequest request = new UpdateWikiEntryRequest();
        request.setTitle("Updated Title");
        request.setContent("Updated content");

        mockMvc.perform(put("/api/wiki/" + entry.getId())
                        .header("Authorization", "Bearer " + gmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Title"))
                .andExpect(jsonPath("$.content").value("Updated content"));
    }

    @Test
    void updateEntry_AsPlayer_ReturnsForbidden() throws Exception {
        WikiEntry entry = createPublicWikiEntry("Test Entry", "test-entry");

        UpdateWikiEntryRequest request = new UpdateWikiEntryRequest();
        request.setTitle("Hacked Title");

        mockMvc.perform(put("/api/wiki/" + entry.getId())
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateEntry_NonExistent_ReturnsNotFound() throws Exception {
        UpdateWikiEntryRequest request = new UpdateWikiEntryRequest();
        request.setTitle("Updated Title");

        mockMvc.perform(put("/api/wiki/99999")
                        .header("Authorization", "Bearer " + gmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ==================== DELETE ENTRY ====================

    @Test
    void deleteEntry_AsGM_DeletesSuccessfully() throws Exception {
        WikiEntry entry = createPublicWikiEntry("To Be Deleted", "to-be-deleted");

        mockMvc.perform(delete("/api/wiki/" + entry.getId())
                        .header("Authorization", "Bearer " + gmToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Wiki entry deleted successfully"));

        assertFalse(wikiEntryRepository.existsById(entry.getId()));
    }

    @Test
    void deleteEntry_AsPlayer_ReturnsForbidden() throws Exception {
        WikiEntry entry = createPublicWikiEntry("Protected Entry", "protected-entry");

        mockMvc.perform(delete("/api/wiki/" + entry.getId())
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isForbidden());

        assertTrue(wikiEntryRepository.existsById(entry.getId()));
    }

    // ==================== GRANT ACCESS ====================

    @Test
    void grantAccess_AsGM_GrantsSuccessfully() throws Exception {
        WikiEntry privateEntry = createPrivateWikiEntry("Secret Info", "secret-info");

        GrantAccessRequest request = new GrantAccessRequest("Discovered in Session 5");

        mockMvc.perform(post("/api/wiki/" + privateEntry.getId() + "/grant-access/" + playerUser.getId())
                        .header("Authorization", "Bearer " + gmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(playerUser.getId()))
                .andExpect(jsonPath("$.grantReason").value("Discovered in Session 5"));

        // Verify player can now access
        mockMvc.perform(get("/api/wiki/slug/secret-info")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk());
    }

    @Test
    void grantAccess_AsPlayer_ReturnsForbidden() throws Exception {
        WikiEntry privateEntry = createPrivateWikiEntry("Secret Info", "secret-info");

        mockMvc.perform(post("/api/wiki/" + privateEntry.getId() + "/grant-access/" + playerUser.getId())
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void grantAccess_Duplicate_ReturnsConflict() throws Exception {
        WikiEntry privateEntry = createPrivateWikiEntry("Secret Info", "secret-info");

        // Grant access first time
        GrantAccessRequest request = new GrantAccessRequest("First grant");
        mockMvc.perform(post("/api/wiki/" + privateEntry.getId() + "/grant-access/" + playerUser.getId())
                        .header("Authorization", "Bearer " + gmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Try to grant again
        mockMvc.perform(post("/api/wiki/" + privateEntry.getId() + "/grant-access/" + playerUser.getId())
                        .header("Authorization", "Bearer " + gmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ==================== REVOKE ACCESS ====================

    @Test
    void revokeAccess_AsGM_RevokesSuccessfully() throws Exception {
        WikiEntry privateEntry = createPrivateWikiEntry("Secret Info", "secret-info");

        // Grant access first
        WikiAccess access = new WikiAccess(privateEntry, playerUser, gmUser, "Test grant");
        wikiAccessRepository.save(access);

        // Verify player can access
        mockMvc.perform(get("/api/wiki/slug/secret-info")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk());

        // Revoke access
        mockMvc.perform(delete("/api/wiki/" + privateEntry.getId() + "/revoke-access/" + playerUser.getId())
                        .header("Authorization", "Bearer " + gmToken))
                .andExpect(status().isOk());

        // Verify player can no longer access
        mockMvc.perform(get("/api/wiki/slug/secret-info")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isForbidden());
    }

    // ==================== GET ACCESS GRANTS ====================

    @Test
    void getAccessGrants_AsGM_ReturnsGrants() throws Exception {
        WikiEntry privateEntry = createPrivateWikiEntry("Secret Info", "secret-info");

        // Grant access to player
        WikiAccess access = new WikiAccess(privateEntry, playerUser, gmUser, "Session reward");
        wikiAccessRepository.save(access);

        mockMvc.perform(get("/api/wiki/" + privateEntry.getId() + "/access-grants")
                        .header("Authorization", "Bearer " + gmToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].username").value("player1"))
                .andExpect(jsonPath("$[0].grantReason").value("Session reward"));
    }

    @Test
    void getAccessGrants_AsPlayer_ReturnsForbidden() throws Exception {
        WikiEntry privateEntry = createPrivateWikiEntry("Secret Info", "secret-info");

        mockMvc.perform(get("/api/wiki/" + privateEntry.getId() + "/access-grants")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isForbidden());
    }
}
