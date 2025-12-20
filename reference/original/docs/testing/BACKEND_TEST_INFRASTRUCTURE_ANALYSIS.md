# Backend Test Infrastructure Analysis

**Date**: 2025-11-17
**Status**: Planning Phase

---

## Current State

### Existing Test Structure
```
backend/src/test/java/com/deadlands/campaign/
└── controller/
    └── (empty - no test files)
```

**Finding**: Test directory structure exists but contains **zero test files**.

### Existing Test Dependencies

From `pom.xml`:
```xml
<!-- Testing -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

### What's Included in `spring-boot-starter-test`

The Spring Boot test starter automatically includes:

1. **JUnit 5 (Jupiter)** - Test framework
   - Modern annotations (`@Test`, `@BeforeEach`, `@AfterEach`)
   - Assertions, assumptions, parameterized tests
   - Test lifecycle management

2. **Mockito** - Mocking framework
   - Mock creation and stubbing
   - Verification of method calls
   - Argument matchers and captors

3. **AssertJ** - Fluent assertions
   - Readable, IDE-friendly assertions
   - Better error messages than JUnit assertions
   - Type-safe API

4. **Hamcrest** - Matcher library
   - Alternative to AssertJ
   - Less commonly used in modern code

5. **JSONassert** - JSON comparison
   - Flexible JSON equality checks
   - Useful for REST API testing

6. **JsonPath** - JSON querying
   - Extract values from JSON responses
   - XPath-like syntax for JSON

7. **Spring Test** - Spring testing support
   - `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest`
   - Test context management
   - MockMvc for controller testing

8. **XMLUnit** - XML comparison (rarely needed)

### What's Missing

1. **Maven Surefire Plugin** - Test execution
   - NOT configured in pom.xml
   - Will use defaults (might not be optimal)

2. **JaCoCo Plugin** - Code coverage
   - NOT configured
   - No coverage reports or enforcement

3. **TestContainers** - Integration testing with real databases
   - NOT included
   - Needed for realistic database tests

4. **REST Assured** - API testing (optional)
   - NOT included
   - Makes REST testing more readable

---

## Recommended Test Infrastructure

### Option 1: Minimal Setup (Recommended for Getting Started)

**What to Add**:
- Maven Surefire Plugin (test execution)
- JaCoCo Plugin (coverage reporting)

**Pros**:
- Everything else already included
- Quick to set up (just pom.xml changes)
- Sufficient for 60% coverage target
- No new learning curve

**Cons**:
- No TestContainers (must use H2 in-memory DB for tests)
- Less realistic database tests

**Use Case**: Perfect for this project
- Controllers, services, security can be tested with mocks
- Repository tests can use H2 (compatible with PostgreSQL)
- Meets coverage goals without complexity

---

### Option 2: Full Integration Testing Suite

**What to Add**:
- Everything from Option 1, plus:
- TestContainers (real PostgreSQL in Docker)
- REST Assured (API testing)

**Pros**:
- Most realistic tests (real database)
- Better confidence in database queries
- Industry best practice

**Cons**:
- Requires Docker running locally
- Slower test execution
- More complex setup
- Overkill for current needs

**Use Case**: Future enhancement when stability is critical

---

## Why Option 1 is Best for Your Project

### 1. Already Have Most Dependencies ✅

You already have through `spring-boot-starter-test`:
- JUnit 5 - Modern, powerful test framework
- Mockito - Industry standard for mocking
- AssertJ - Best-in-class assertions
- Spring Test - All Spring testing annotations

**Only Missing**: Build plugins (Surefire, JaCoCo)

### 2. Fits Your Tech Stack Perfectly

**Spring Boot 3.2.1** comes with:
- `@WebMvcTest` - Test controllers in isolation
- `@DataJpaTest` - Test repositories with H2
- `@SpringBootTest` - Integration tests
- `MockMvc` - Test HTTP endpoints without server

These annotations are **perfect** for testing:
- `AuthController` → `@WebMvcTest`
- `GameController` → `@WebMvcTest` + WebSocket test support
- `CharacterController` → `@WebMvcTest`
- Repositories → `@DataJpaTest` with H2
- Security → `@SpringBootTest` + `@WithMockUser`

### 3. H2 is Sufficient for Your Needs

**Why H2 over TestContainers**:
- Your queries are simple (JPA/Hibernate handles them)
- No complex PostgreSQL-specific features used
- H2 supports PostgreSQL compatibility mode
- Tests run 10x faster
- No Docker dependency

**When to upgrade to TestContainers**:
- Complex SQL queries with PostgreSQL extensions
- Database triggers or stored procedures
- Performance testing with real DB

### 4. Minimal Configuration, Maximum Value

**Just add to `pom.xml`**:
```xml
<!-- 2 plugins, ~60 lines of XML -->
- Maven Surefire Plugin
- JaCoCo Plugin with 60% threshold
```

**Result**:
- Run tests: `mvn test`
- Check coverage: `mvn jacoco:report`
- Enforce coverage: `mvn jacoco:check`
- HTML report: `target/site/jacoco/index.html`

### 5. Perfect for Your Coverage Goals

**Target**: 60% backend coverage

**What to test** (in order of priority):
1. **Controllers** (30% of coverage)
   - `@WebMvcTest` with MockMvc
   - Fast, isolated, easy to write
   - Example: 5 tests for AuthController = 10% coverage

2. **Services** (20% of coverage)
   - `@ExtendWith(MockitoExtension.class)`
   - Pure unit tests with mocks
   - Fast, no Spring context needed

3. **Security** (10% of coverage)
   - JWT token provider tests
   - Security configuration tests
   - Critical for production safety

**Total effort**: ~50-60 tests to hit 60% coverage

---

## Recommended Stack Summary

### Test Framework: JUnit 5 ✅
**Why**: Already included, modern, powerful
- Annotations: `@Test`, `@BeforeEach`, `@ParameterizedTest`
- Assertions: Built-in but prefer AssertJ
- Lifecycle: `@BeforeAll`, `@AfterEach`, etc.

### Mocking: Mockito ✅
**Why**: Already included, industry standard
- `@Mock` - Create mocks
- `when(...).thenReturn(...)` - Stub behavior
- `verify(mock).method()` - Verify interactions

### Assertions: AssertJ ✅
**Why**: Already included, most readable
```java
// AssertJ (recommended)
assertThat(user.getUsername()).isEqualTo("testuser");
assertThat(characters).hasSize(3).allMatch(c -> c.getName() != null);

// vs JUnit (verbose)
assertEquals("testuser", user.getUsername());
assertTrue(characters.size() == 3);
```

### Spring Testing: @WebMvcTest, @DataJpaTest ✅
**Why**: Already included via spring-boot-starter-test
```java
@WebMvcTest(AuthController.class)
class AuthControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean UserRepository userRepository;

    @Test
    void login_withValidCredentials_returnsToken() {
        // Test controller without starting full app
    }
}
```

### Database Testing: H2 ✅
**Why**: Already available, PostgreSQL-compatible
```java
@DataJpaTest
class CharacterRepositoryTest {
    @Autowired TestEntityManager entityManager;
    @Autowired CharacterRepository repository;

    @Test
    void findByUserId_returnsCharacters() {
        // Uses in-memory H2, fast, no Docker
    }
}
```

### Coverage: JaCoCo (Need to Add)
**Why**: Industry standard, Maven integration
- Generates HTML reports
- Can enforce minimum coverage
- Integrates with CI/CD

### Test Execution: Maven Surefire (Need to Add)
**Why**: Standard Maven test runner
- Runs tests during `mvn test`
- Parallel execution support
- Nice console output

---

## What NOT to Use (And Why)

### ❌ TestNG
**Why avoid**: JUnit 5 is more modern, better Spring support

### ❌ PowerMock
**Why avoid**: Hacky, unmaintained, breaks with newer Java versions

### ❌ EasyMock
**Why avoid**: Mockito is more popular, better API

### ❌ JUnit 4
**Why avoid**: Old, you already have JUnit 5

### ❌ Custom test frameworks
**Why avoid**: Reinventing the wheel, no community support

---

## Implementation Plan

### Step 1: Add Maven Plugins (5 minutes)
```xml
<!-- Add to pom.xml -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.0.0-M9</version>
</plugin>

<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.11</version>
    <executions>
        <execution><goals><goal>prepare-agent</goal></goals></execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
        <execution>
            <id>jacoco-check</id>
            <goals><goal>check</goal></goals>
            <configuration>
                <rules>
                    <rule>
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

### Step 2: Create First Test (10 minutes)
```java
// backend/src/test/java/com/deadlands/campaign/controller/AuthControllerTest.java
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean AuthenticationManager authenticationManager;
    @MockBean UserRepository userRepository;
    @MockBean PasswordEncoder passwordEncoder;
    @MockBean JwtTokenProvider tokenProvider;

    @Test
    void login_withValidCredentials_returnsToken() throws Exception {
        // Arrange
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
            .andExpect(jsonPath("$.username").value("testuser"));
    }
}
```

### Step 3: Run Tests (1 minute)
```bash
mvn test                    # Run all tests
mvn jacoco:report          # Generate coverage report
mvn jacoco:check           # Enforce 60% coverage
open target/site/jacoco/index.html  # View HTML report
```

### Step 4: Iterate (ongoing)
- Add tests for each controller
- Add service tests
- Add security tests
- Monitor coverage increasing

---

## Testing Strategy by Component

### Controllers (Use @WebMvcTest)
```java
@WebMvcTest(CharacterController.class)
class CharacterControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean CharacterService characterService;  // Mock the service

    @Test
    void getCharacters_returnsCharacterList() { ... }
}
```

### Services (Use @ExtendWith(MockitoExtension.class))
```java
@ExtendWith(MockitoExtension.class)
class AIGameMasterServiceTest {
    @Mock AnthropicChatClient chatClient;
    @InjectMocks AIGameMasterService service;

    @Test
    void generateNPCDialogue_returnsDialogue() { ... }
}
```

### Repositories (Use @DataJpaTest)
```java
@DataJpaTest
class CharacterRepositoryTest {
    @Autowired TestEntityManager entityManager;
    @Autowired CharacterRepository repository;

    @Test
    void findByUserId_returnsCharacters() { ... }
}
```

### Security (Use @SpringBootTest)
```java
@SpringBootTest
class JwtTokenProviderTest {
    @Autowired JwtTokenProvider tokenProvider;

    @Test
    void generateToken_createsValidJWT() { ... }
}
```

### WebSocket (Use @SpringBootTest + WebSocket test client)
```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class GameControllerTest {
    @LocalServerPort int port;

    @Test
    void handleTokenMove_broadcastsToAllClients() {
        // Use StompSession to test WebSocket
    }
}
```

---

## Comparison with Alternatives

| Framework | Included? | Reason to Use / Not Use |
|-----------|-----------|------------------------|
| **JUnit 5** | ✅ Yes | **RECOMMENDED** - Modern, powerful, already included |
| JUnit 4 | ⚠️ Legacy | Avoid - outdated, you have JUnit 5 |
| TestNG | ❌ No | Avoid - JUnit 5 is better for Spring |
| **Mockito** | ✅ Yes | **RECOMMENDED** - Industry standard, already included |
| EasyMock | ❌ No | Avoid - Mockito is more popular |
| PowerMock | ❌ No | Avoid - Breaks with modern Java, unmaintained |
| **AssertJ** | ✅ Yes | **RECOMMENDED** - Most readable, already included |
| Hamcrest | ✅ Yes (included) | Optional - AssertJ is better |
| **Spring Test** | ✅ Yes | **REQUIRED** - Provides @WebMvcTest, @DataJpaTest, etc. |
| **H2 Database** | ✅ Yes (in pom.xml) | **RECOMMENDED** - Fast, PostgreSQL-compatible |
| TestContainers | ❌ No | Optional - Add later if needed |
| **JaCoCo** | ❌ No | **MUST ADD** - Coverage reporting |
| Maven Surefire | ⚠️ Default | **MUST ADD** - Better test execution |
| REST Assured | ❌ No | Optional - Not critical for this project |

---

## Final Recommendation

### ✅ Use This Stack:

1. **JUnit 5** (already have) - Test framework
2. **Mockito** (already have) - Mocking
3. **AssertJ** (already have) - Assertions
4. **Spring Test** (already have) - Spring testing support
5. **H2** (already have) - In-memory database
6. **JaCoCo** (add now) - Coverage reporting
7. **Maven Surefire** (add now) - Test execution

### Why This Stack?

✅ **Minimal additions** - Only 2 plugins to add
✅ **Industry standard** - Used by thousands of Spring projects
✅ **Perfect for your needs** - Controllers, services, security, repositories
✅ **Fast tests** - No Docker overhead
✅ **Easy to learn** - Tons of examples online
✅ **Meets coverage goals** - Can easily hit 60%+
✅ **Spring Boot optimized** - Designed to work together

### Total Setup Time: 15 minutes
- 5 min: Add Maven plugins
- 10 min: Write first test
- ✅ Done!

---

**Next Action**: Add Maven Surefire and JaCoCo plugins to `pom.xml`
