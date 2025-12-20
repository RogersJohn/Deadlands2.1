package com.deadlands.campaign.config;

import com.deadlands.campaign.model.User;
import com.deadlands.campaign.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("production")
public class DatabaseInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseInitializer.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        logger.info("Checking if database initialization is needed...");

        // Check if any users exist
        long userCount = userRepository.count();

        if (userCount == 0) {
            logger.info("No users found. Initializing database with default users...");
            initializeUsers();
        } else {
            logger.info("Database already initialized. Found {} users.", userCount);
        }
    }

    private void initializeUsers() {
        // Create Game Master
        User gameMaster = User.builder()
                .username("gamemaster")
                .email("gm@deadlands.com")
                .password(passwordEncoder.encode("password123"))
                .role(User.Role.GAME_MASTER)
                .active(true)
                .build();
        userRepository.save(gameMaster);
        logger.info("Created user: gamemaster");

        // Create Player 1
        User player1 = User.builder()
                .username("player1")
                .email("player1@deadlands.com")
                .password(passwordEncoder.encode("password123"))
                .role(User.Role.PLAYER)
                .active(true)
                .build();
        userRepository.save(player1);
        logger.info("Created user: player1");

        // Create Player 2
        User player2 = User.builder()
                .username("player2")
                .email("player2@deadlands.com")
                .password(passwordEncoder.encode("password123"))
                .role(User.Role.PLAYER)
                .active(true)
                .build();
        userRepository.save(player2);
        logger.info("Created user: player2");

        logger.info("Database initialization completed successfully!");
    }
}
