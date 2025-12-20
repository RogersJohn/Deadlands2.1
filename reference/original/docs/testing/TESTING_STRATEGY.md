# Comprehensive Testing Strategy

**Created**: 2025-11-17
**Target Coverage**: Backend 60% | Frontend 70% | E2E Critical Paths
**Status**: 🟡 In Progress

---

## Overview

This document outlines the complete testing strategy for Deadlands Campaign Manager, including unit tests, integration tests, E2E tests, and CI/CD automation.

---

## Current State

### Test Coverage Summary

| Layer | Files | Tests | Coverage | Status |
|-------|-------|-------|----------|--------|
| **Backend** | 66 Java files | 0 tests | 0% | 🔴 Critical |
| **Frontend** | 60 TS/TSX files | 5 test files | ~8% | 🟡 Very Low |
| **E2E** | 2 features | 77 steps | Blocked | 🔴 Infrastructure ready, tests blocked |

### Existing Tests

#### Frontend Unit Tests (5 files):
1. `MovementBudget.test.ts` - Game mechanics
2. `ParryRules.test.ts` - Combat rules
3. `CriticalRules.test.ts` - Critical hits
4. `Phase1Modifiers.test.ts` - Combat modifiers
5. `ActionMenu.test.tsx` - UI component

#### Backend Unit Tests:
- **NONE** ❌

---

## Testing Pyramid

```
        /\
       /  \    E2E Tests
      /----\   (Critical User Journeys)
     /      \
    /--------\  Integration Tests
   /          \ (API, Database, WebSocket)
  /------------\
 /--------------\ Unit Tests
/                \ (Business Logic, Pure Functions)
```

### Distribution Target:
- **70%** - Unit tests (fast, focused, isolated)
- **20%** - Integration tests (realistic, slower)
- **10%** - E2E tests (full stack, slowest)

---

## Backend Testing Strategy

### Phase 1: Test Infrastructure Setup

#### 1.1 Add Test Dependencies
```xml
<!-- pom.xml -->
<dependencies>
    <!-- JUnit 5 -->
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Mockito -->
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-core</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- AssertJ -->
    <dependency>
        <groupId>org.assertj</groupId>
        <artifactId>assertj-core</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Spring Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- TestContainers for PostgreSQL integration tests -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

#### 1.2 Configure Maven Plugins
```xml
<!-- Maven Surefire for test execution -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.0.0-M9</version>
</plugin>

<!-- JaCoCo for coverage -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.11</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>jacoco-check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>PACKAGE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.60</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Phase 2: Unit Tests (Target: 60% coverage)

#### 2.1 Controller Tests
**Priority: CRITICAL**

```java
// backend/src/test/java/com/deadlands/campaign/controller/AuthControllerTest.java
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @Test
    void login_withValidCredentials_returnsToken() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest("testuser", "password");
        User user = new User();
        user.setUsername("testuser");
        user.setRole("PLAYER");

        when(authenticationManager.authenticate(any()))
            .thenReturn(new UsernamePasswordAuthenticationToken("testuser", "password"));
        when(userRepository.findByUsername("testuser"))
            .thenReturn(Optional.of(user));
        when(tokenProvider.generateToken(any()))
            .thenReturn("fake-jwt-token");

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"testuser\",\"password\":\"password\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("fake-jwt-token"))
            .andExpect(jsonPath("$.username").value("testuser"))
            .andExpect(jsonPath("$.role").value("PLAYER"));
    }

    @Test
    void login_withInvalidCredentials_returnsUnauthorized() throws Exception {
        // Arrange
        when(authenticationManager.authenticate(any()))
            .thenThrow(new BadCredentialsException("Invalid credentials"));

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"wrong\",\"password\":\"wrong\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void register_withValidData_createsUser() throws Exception {
        // Test registration logic
    }

    @Test
    void register_withExistingUsername_returnsBadRequest() throws Exception {
        // Test duplicate username handling
    }
}
```

**All Controllers to Test**:
- [x] `AuthControllerTest` (login, register, password change)
- [ ] `CharacterControllerTest` (CRUD, authorization)
- [ ] `ReferenceDataControllerTest` (public endpoints)
- [ ] `WikiControllerTest` (permission-based access)
- [ ] `AIAssistantControllerTest` (AI integration)
- [ ] `GameControllerTest` (WebSocket handlers) - **NEW**

#### 2.2 Service Tests
**Priority: HIGH**

```java
// backend/src/test/java/com/deadlands/campaign/service/AIGameMasterServiceTest.java
@ExtendWith(MockitoExtension.class)
class AIGameMasterServiceTest {

    @Mock
    private AnthropicChatClient chatClient;

    @InjectMocks
    private AIGameMasterService aiGameMasterService;

    @Test
    void generateNPCDialogue_returnsDialogue() {
        // Mock AI response
        ChatResponse response = new ChatResponse();
        // ... setup mock

        when(chatClient.call(any(Prompt.class)))
            .thenReturn(response);

        NPCDialogueRequest request = new NPCDialogueRequest();
        request.setNpcName("Sheriff");
        request.setContext("Town square confrontation");

        AIResponse result = aiGameMasterService.generateNPCDialogue(request);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).contains("Sheriff");
    }

    @Test
    void generateNPCDialogue_whenAPIFails_throwsException() {
        // Test error handling
    }
}
```

#### 2.3 Security Tests
**Priority: CRITICAL**

```java
@SpringBootTest
class JwtTokenProviderTest {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Test
    void generateToken_createsValidJWT() {
        Authentication auth = new UsernamePasswordAuthenticationToken("testuser", null);

        String token = tokenProvider.generateToken(auth);

        assertThat(token).isNotNull();
        assertThat(tokenProvider.validateToken(token)).isTrue();
        assertThat(tokenProvider.getUsernameFromToken(token)).isEqualTo("testuser");
    }

    @Test
    void validateToken_withExpiredToken_returnsFalse() {
        // Test token expiration
    }

    @Test
    void validateToken_withMalformedToken_returnsFalse() {
        assertThat(tokenProvider.validateToken("invalid-token")).isFalse();
    }
}
```

#### 2.4 Repository Tests
**Priority: MEDIUM**

```java
@DataJpaTest
class CharacterRepositoryTest {

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByUserId_returnsUserCharacters() {
        // Create test user and characters
        User user = new User();
        user.setUsername("testuser");
        entityManager.persist(user);

        Character char1 = new Character();
        char1.setName("John Doe");
        char1.setUser(user);
        entityManager.persist(char1);

        // Test query
        List<Character> characters = characterRepository.findByUserId(user.getId());

        assertThat(characters).hasSize(1);
        assertThat(characters.get(0).getName()).isEqualTo("John Doe");
    }
}
```

### Phase 3: Integration Tests

#### 3.1 API Integration Tests
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class CharacterIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:14");

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void createCharacter_endToEnd_savesToDatabase() {
        // Full integration test: HTTP → Controller → Service → Repository → Database
    }
}
```

#### 3.2 WebSocket Integration Tests
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WebSocketIntegrationTest {

    @Test
    void tokenMove_broadcastsToAllClients() {
        // Connect multiple WebSocket clients
        // Send token move
        // Verify all clients receive broadcast
    }
}
```

---

## Frontend Testing Strategy

### Phase 1: Test Infrastructure

#### 1.1 Update vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        'dist/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Phase 2: Unit Tests (Target: 70% coverage)

#### 2.1 Service Tests
**Priority: CRITICAL**

```typescript
// frontend/src/services/__tests__/authService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { authService } from '../authService';

vi.mock('axios');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('calls API with correct credentials', async () => {
      const mockResponse = {
        data: {
          token: 'fake-token',
          username: 'testuser',
          role: 'PLAYER',
        },
      };

      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      const result = await authService.login('testuser', 'password');

      expect(axios.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('throws error when login fails', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Unauthorized'));

      await expect(
        authService.login('wrong', 'wrong')
      ).rejects.toThrow('Unauthorized');
    });
  });
});
```

**All Services to Test**:
- [ ] `authService.test.ts`
- [ ] `characterService.test.ts`
- [ ] `referenceDataService.test.ts`
- [ ] `wikiService.test.ts`
- [ ] `aiService.test.ts`
- [ ] `mapService.test.ts`
- [ ] `websocketService.test.ts` - **NEW**

#### 2.2 Store Tests

```typescript
// frontend/src/store/__tests__/authStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null });
  });

  it('sets user and token on login', () => {
    const { login } = useAuthStore.getState();

    login('fake-token', { id: 1, username: 'test', role: 'PLAYER' });

    const state = useAuthStore.getState();
    expect(state.token).toBe('fake-token');
    expect(state.user?.username).toBe('test');
  });

  it('clears user and token on logout', () => {
    const { login, logout } = useAuthStore.getState();

    login('fake-token', { id: 1, username: 'test', role: 'PLAYER' });
    logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });
});
```

#### 2.3 Component Tests

```typescript
// frontend/src/components/__tests__/Login.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from '../Login';
import { authService } from '../../services/authService';

vi.mock('../../services/authService');

describe('Login Component', () => {
  it('renders login form', () => {
    render(<Login />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('submits login form with credentials', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      token: 'fake-token',
      username: 'test',
      role: 'PLAYER',
    });

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('testuser', 'password');
    });
  });

  it('displays error message on failed login', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new Error('Invalid credentials')
    );

    render(<Login />);

    // Submit form...
    // Check for error message
  });
});
```

#### 2.4 Game Engine Tests

```typescript
// Expand existing tests in frontend/src/game/engine/__tests__/

// Add tests for:
- [ ] CombatManager.test.ts
- [ ] LineOfSight.test.ts
- [ ] AttackRules.test.ts
- [ ] DamageCalculation.test.ts
```

---

## E2E Testing Strategy

### Phase 1: Refactor for Single Shared World

#### Update Feature Files

**Before** (Session-based):
```gherkin
Feature: Multiplayer Token Synchronization
  Scenario: Two players see each other's movements
    When "e2e_testgm" creates a session named "Test Session" with max players 5
    And "e2e_player1" joins the session with their character
```

**After** (Shared world):
```gherkin
Feature: Shared World Token Synchronization
  Background:
    Given the application is running
    And test accounts exist

  @critical @multiplayer @shared-world
  Scenario: Two players see each other's movements in shared world
    Given "e2e_testgm" logs in and selects a character
    And "e2e_player1" logs in and selects a character
    And both players are in the game arena
    When "e2e_player1" moves their token to position (110, 95)
    Then "e2e_testgm" should see "e2e_player1"'s token at position (110, 95)
```

#### Update Step Definitions

```javascript
// test/e2e/features/step_definitions/shared_world_steps.js
Given('{string} logs in and selects a character', async function (username) {
  const browser = await this.getBrowser(username);
  const loginPage = new LoginPage(browser);

  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.config.testUsers[username].password);

  // Navigate directly to game arena (no session selection)
  await browser.get(`${this.config.frontendUrl}/game`);

  const gameArena = new GameArenaPage(browser);
  await gameArena.selectCharacter(0); // Select first character
});

Given('both players are in the game arena', async function () {
  // Verify both browsers show game canvas
  const player1Browser = await this.getBrowser('e2e_player1');
  const gmBrowser = await this.getBrowser('e2e_testgm');

  const gameArena1 = new GameArenaPage(player1Browser);
  const gameArena2 = new GameArenaPage(gmBrowser);

  expect(await gameArena1.isArenaLoaded()).toBe(true);
  expect(await gameArena2.isArenaLoaded()).toBe(true);
});
```

### Phase 2: New E2E Scenarios

```gherkin
@shared-world @websocket
Scenario: Player sees existing players when joining
  Given "e2e_player1" is in the game arena at position (100, 100)
  When "e2e_player2" joins the game arena
  Then "e2e_player2" should see "e2e_player1"'s token at position (100, 100)

@shared-world @disconnect
Scenario: Player reconnects and rejoins shared world
  Given "e2e_player1" is in the game arena
  When "e2e_player1" loses connection
  And "e2e_player1" reconnects after 5 seconds
  Then "e2e_player1" should see their previous token position
  And other players should still see "e2e_player1"'s token

@shared-world @performance
Scenario: System handles many simultaneous players
  Given 5 players are in the game arena
  When all 5 players move simultaneously
  Then all movements should be synchronized across all clients
  And no movements should be lost
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}

      - name: Run backend tests
        run: |
          cd backend
          mvn clean test

      - name: Generate coverage report
        run: |
          cd backend
          mvn jacoco:report

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/target/site/jacoco/jacoco.xml
          flags: backend

      - name: Check coverage threshold
        run: |
          cd backend
          mvn jacoco:check

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run frontend tests
        run: |
          cd frontend
          npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/coverage-final.json
          flags: frontend

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker
        uses: docker/setup-buildx-action@v2

      - name: Run E2E tests
        run: |
          cd test/e2e
          docker-compose up --abort-on-container-exit

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-reports
          path: test/e2e/reports/

  deploy:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests, e2e-tests]
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to Railway
        # Only deploy if all tests pass
        run: echo "Deploy to Railway"
```

---

## Coverage Enforcement

### Backend (pom.xml)
```xml
<configuration>
    <rules>
        <rule>
            <element>BUNDLE</element>
            <limits>
                <limit>
                    <counter>LINE</counter>
                    <value>COVEREDRATIO</value>
                    <minimum>0.60</minimum>
                </limit>
            </limits>
        </rule>
    </rules>
</configuration>
```

### Frontend (vitest.config.ts)
```typescript
coverage: {
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70,
  },
}
```

---

## Test Data Management

### Backend Test Data
```java
// backend/src/test/java/com/deadlands/campaign/util/TestDataBuilder.java
public class TestDataBuilder {

    public static User createTestUser() {
        User user = new User();
        user.setUsername("testuser");
        user.setPassword("encoded-password");
        user.setRole("PLAYER");
        return user;
    }

    public static Character createTestCharacter(User user) {
        Character character = new Character();
        character.setName("Test Character");
        character.setUser(user);
        character.setAgility(8);
        // ... set other fields
        return character;
    }
}
```

### E2E Test Data
```javascript
// test/e2e/support/testData.js
module.exports = {
  testUsers: {
    gm: { username: 'e2e_testgm', password: 'Test123!', role: 'GAME_MASTER' },
    player1: { username: 'e2e_player1', password: 'Test123!', role: 'PLAYER' },
    player2: { username: 'e2e_player2', password: 'Test123!', role: 'PLAYER' },
  },
};
```

---

## Metrics & Reporting

### Track These Metrics:
- **Test Execution Time**: Backend + Frontend + E2E
- **Code Coverage**: Per package/module
- **Test Flakiness**: Failed tests that pass on retry
- **Build Success Rate**: % of passing builds

### Dashboard:
- Use Codecov for coverage visualization
- GitHub Actions for build status
- Generate HTML reports for local review

---

## Timeline

### Week 1: Backend Testing
- [ ] Day 1-2: Set up infrastructure (dependencies, plugins)
- [ ] Day 3-4: Write controller tests (Auth, Character)
- [ ] Day 5-7: Write service and security tests

### Week 2: Frontend Testing
- [ ] Day 1-2: Configure coverage thresholds
- [ ] Day 3-4: Write service tests
- [ ] Day 5-7: Write component and store tests

### Week 3: E2E & Integration
- [ ] Day 1-3: Refactor E2E tests for shared world
- [ ] Day 4-5: Write integration tests
- [ ] Day 6-7: Set up CI/CD pipeline

### Week 4: Polish & Automation
- [ ] Day 1-2: Fix flaky tests
- [ ] Day 3-4: Optimize test execution time
- [ ] Day 5-7: Documentation and onboarding

---

## Success Criteria

### Definition of Done:
- ✅ Backend: 60%+ coverage, all critical paths tested
- ✅ Frontend: 70%+ coverage, all services/stores tested
- ✅ E2E: All critical user journeys pass
- ✅ CI/CD: Automated on every push
- ✅ Documentation: Testing guide written

---

**Next Steps**: Begin implementation with GameController and backend test infrastructure.
