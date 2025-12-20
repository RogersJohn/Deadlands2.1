package com.deadlands.campaign.config;

import com.deadlands.campaign.model.User;
import com.deadlands.campaign.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Initializes test data on application startup.
 *
 * Ensures E2E test accounts have correct roles:
 * - e2e_testgm → GAME_MASTER
 * - e2e_player1 → PLAYER
 * - e2e_player2 → PLAYER
 */
@Component
public class TestDataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(TestDataInitializer.class);

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) {
        logger.info("========================================");
        logger.info("Test Data Initializer Running");
        logger.info("========================================");

        fixTestUserRoles();

        logger.info("Test Data Initialization Complete");
        logger.info("========================================");
    }

    /**
     * Fix test user roles to ensure E2E tests work correctly
     */
    private void fixTestUserRoles() {
        // Fix e2e_testgm to GAME_MASTER
        userRepository.findByUsername("e2e_testgm").ifPresent(user -> {
            if (user.getRole() != User.Role.GAME_MASTER) {
                logger.info("Fixing e2e_testgm role: {} → GAME_MASTER", user.getRole());
                user.setRole(User.Role.GAME_MASTER);
                userRepository.save(user);
                logger.info("✓ e2e_testgm role updated to GAME_MASTER");
            } else {
                logger.info("✓ e2e_testgm already has GAME_MASTER role");
            }
        });

        // Fix e2e_player1 to PLAYER
        userRepository.findByUsername("e2e_player1").ifPresent(user -> {
            if (user.getRole() != User.Role.PLAYER) {
                logger.info("Fixing e2e_player1 role: {} → PLAYER", user.getRole());
                user.setRole(User.Role.PLAYER);
                userRepository.save(user);
                logger.info("✓ e2e_player1 role updated to PLAYER");
            } else {
                logger.info("✓ e2e_player1 already has PLAYER role");
            }
        });

        // Fix e2e_player2 to PLAYER
        userRepository.findByUsername("e2e_player2").ifPresent(user -> {
            if (user.getRole() != User.Role.PLAYER) {
                logger.info("Fixing e2e_player2 role: {} → PLAYER", user.getRole());
                user.setRole(User.Role.PLAYER);
                userRepository.save(user);
                logger.info("✓ e2e_player2 role updated to PLAYER");
            } else {
                logger.info("✓ e2e_player2 already has PLAYER role");
            }
        });
    }
}
