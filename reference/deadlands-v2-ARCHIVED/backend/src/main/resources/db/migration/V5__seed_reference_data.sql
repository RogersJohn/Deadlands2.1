-- V5: Seed Reference Data
-- Core Savage Worlds / Deadlands reference data

-- =====================================================
-- SKILLS (Savage Worlds Core + Deadlands)
-- =====================================================
INSERT INTO skill_references (name, linked_attribute, description, is_core, sourcebook) VALUES
-- Agility-based
('Athletics', 'AGILITY', 'Climbing, jumping, balancing, throwing, catching.', TRUE, 'Savage Worlds Core'),
('Boating', 'AGILITY', 'Operating water vessels.', FALSE, 'Savage Worlds Core'),
('Driving', 'AGILITY', 'Operating ground vehicles and wagons.', FALSE, 'Savage Worlds Core'),
('Fighting', 'AGILITY', 'Melee combat with fists, knives, swords, etc.', TRUE, 'Savage Worlds Core'),
('Riding', 'AGILITY', 'Riding horses and other mounts.', FALSE, 'Savage Worlds Core'),
('Shooting', 'AGILITY', 'Ranged combat with firearms, bows, etc.', TRUE, 'Savage Worlds Core'),
('Stealth', 'AGILITY', 'Sneaking and hiding.', TRUE, 'Savage Worlds Core'),
('Thievery', 'AGILITY', 'Lockpicking, pickpocketing, sleight of hand.', FALSE, 'Savage Worlds Core'),

-- Smarts-based
('Academics', 'SMARTS', 'Liberal arts, humanities, general knowledge.', FALSE, 'Savage Worlds Core'),
('Battle', 'SMARTS', 'Military tactics and strategy.', FALSE, 'Savage Worlds Core'),
('Common Knowledge', 'SMARTS', 'General knowledge about the setting.', TRUE, 'Savage Worlds Core'),
('Electronics', 'SMARTS', 'Electronic devices and systems.', FALSE, 'Savage Worlds Core'),
('Gambling', 'SMARTS', 'Games of chance and reading opponents.', FALSE, 'Deadlands Core'),
('Hacking', 'SMARTS', 'Computer intrusion and security.', FALSE, 'Savage Worlds Core'),
('Healing', 'SMARTS', 'Medical treatment and first aid.', FALSE, 'Savage Worlds Core'),
('Language', 'SMARTS', 'Speaking foreign languages.', FALSE, 'Savage Worlds Core'),
('Notice', 'SMARTS', 'Perception and awareness.', TRUE, 'Savage Worlds Core'),
('Occult', 'SMARTS', 'Knowledge of supernatural and mystical.', FALSE, 'Savage Worlds Core'),
('Repair', 'SMARTS', 'Fixing mechanical devices.', FALSE, 'Savage Worlds Core'),
('Research', 'SMARTS', 'Finding information through investigation.', FALSE, 'Savage Worlds Core'),
('Science', 'SMARTS', 'Scientific knowledge and methods.', FALSE, 'Savage Worlds Core'),
('Survival', 'SMARTS', 'Living off the land, tracking.', FALSE, 'Savage Worlds Core'),
('Taunt', 'SMARTS', 'Insulting and enraging opponents.', FALSE, 'Savage Worlds Core'),

-- Spirit-based
('Faith', 'SPIRIT', 'Arcane skill for Blessed.', FALSE, 'Deadlands Core'),
('Focus', 'SPIRIT', 'Arcane skill for Chi Masters.', FALSE, 'Deadlands Core'),
('Intimidation', 'SPIRIT', 'Scaring and threatening.', FALSE, 'Savage Worlds Core'),
('Performance', 'SPIRIT', 'Acting, singing, entertainment.', FALSE, 'Savage Worlds Core'),
('Persuasion', 'SPIRIT', 'Social interaction and convincing.', TRUE, 'Savage Worlds Core'),
('Spellcasting', 'SMARTS', 'Arcane skill for Hucksters.', FALSE, 'Deadlands Core'),
('Weird Science', 'SMARTS', 'Arcane skill for Mad Scientists.', FALSE, 'Deadlands Core');

-- =====================================================
-- EDGES (Core Selection)
-- =====================================================
INSERT INTO edge_references (name, category, requirements, effects, description, sourcebook) VALUES
-- Background Edges
('Alertness', 'BACKGROUND', 'Novice', '+2 to Notice rolls', 'The hero is very observant.', 'Savage Worlds Core'),
('Ambidextrous', 'BACKGROUND', 'Novice, Agility d8+', 'Ignore -2 penalty for off-hand', 'Can use either hand equally well.', 'Savage Worlds Core'),
('Arcane Background (Blessed)', 'BACKGROUND', 'Novice, Spirit d6+', 'Grants Faith skill and powers', 'Servant of a higher power.', 'Deadlands Core'),
('Arcane Background (Huckster)', 'BACKGROUND', 'Novice, Smarts d6+', 'Grants Spellcasting and powers', 'Deals with manitous for power.', 'Deadlands Core'),
('Arcane Background (Mad Scientist)', 'BACKGROUND', 'Novice, Smarts d8+', 'Grants Weird Science and gadgets', 'Creates ghost rock powered devices.', 'Deadlands Core'),
('Arcane Background (Shaman)', 'BACKGROUND', 'Novice, Spirit d6+', 'Grants Focus and powers', 'Communes with nature spirits.', 'Deadlands Core'),
('Attractive', 'BACKGROUND', 'Novice, Vigor d6+', '+1 to Performance and Persuasion', 'The character is particularly good-looking.', 'Savage Worlds Core'),
('Brawny', 'BACKGROUND', 'Novice, Strength d6+, Vigor d6+', 'Size +1, Toughness +1', 'Large and strong.', 'Savage Worlds Core'),
('Fame', 'BACKGROUND', 'Novice', '+1 Persuasion, +2 to influence groups', 'Well-known and recognized.', 'Savage Worlds Core'),
('Fleet-Footed', 'BACKGROUND', 'Novice, Agility d6+', 'Pace +2, d10 running die', 'Fast runner.', 'Savage Worlds Core'),
('Luck', 'BACKGROUND', 'Novice', '+1 Benny per session', 'Born lucky.', 'Savage Worlds Core'),
('Quick', 'BACKGROUND', 'Novice, Agility d8+', 'Redraw initiative cards of 5 or less', 'Lightning reflexes.', 'Savage Worlds Core'),
('Rich', 'BACKGROUND', 'Novice', '3x starting funds, $500 salary', 'Wealthy background.', 'Savage Worlds Core'),

-- Combat Edges
('Block', 'COMBAT', 'Seasoned, Fighting d8+', '+1 Parry, +1 vs gang up', 'Skilled defender.', 'Savage Worlds Core'),
('Brawler', 'COMBAT', 'Novice, Strength d8+', '+1 damage with fists, Toughness +1 to unarmed attacks', 'Trained brawler.', 'Savage Worlds Core'),
('Dodge', 'COMBAT', 'Seasoned, Agility d8+', '-2 to be hit by ranged attacks', 'Hard to hit with ranged attacks.', 'Savage Worlds Core'),
('First Strike', 'COMBAT', 'Novice, Agility d8+', 'Free attack vs foe who moves adjacent', 'Quick to strike.', 'Savage Worlds Core'),
('Frenzy', 'COMBAT', 'Seasoned, Fighting d8+', 'Extra Fighting die on one attack', 'Whirlwind of attacks.', 'Savage Worlds Core'),
('Hip-Shooting', 'COMBAT', 'Seasoned, Shooting d8+', 'Ignore -2 penalty for shooting without aiming', 'Quick draw specialist.', 'Deadlands Core'),
('Improved Trademark Weapon', 'COMBAT', 'Seasoned, Trademark Weapon', '+2 to Fighting or Shooting with specific weapon', 'Master of a specific weapon.', 'Savage Worlds Core'),
('Marksman', 'COMBAT', 'Seasoned, Shooting d8+', '+1 to Shooting if no movement', 'Steady aim.', 'Savage Worlds Core'),
('Nerves of Steel', 'COMBAT', 'Novice, Vigor d8+', 'Ignore 1 point of wound penalties', 'Tough and focused.', 'Savage Worlds Core'),
('Quick Draw', 'COMBAT', 'Novice, Agility d8+', 'Draw weapon as free action', 'Lightning fast draw.', 'Savage Worlds Core'),
('Steady Hands', 'COMBAT', 'Novice, Agility d8+', 'Ignore unstable platform penalty', 'Shoots well from horseback or vehicles.', 'Savage Worlds Core'),
('Trademark Weapon', 'COMBAT', 'Novice, Fighting/Shooting d8+', '+1 to Fighting or Shooting with specific weapon', 'Bonded with a specific weapon.', 'Savage Worlds Core'),
('Two-Fisted', 'COMBAT', 'Novice, Agility d8+', 'May attack with weapon in each hand without multi-action penalty', 'Fights with two weapons.', 'Savage Worlds Core'),

-- Professional Edges
('McGyver', 'PROFESSIONAL', 'Novice, Smarts d6+, Repair d6+', 'Create improvised devices', 'Improvises gadgets from scraps.', 'Savage Worlds Core'),
('Soldier', 'PROFESSIONAL', 'Novice, Strength d6+, Vigor d6+', '+2 to resist fatigue, free Reloads', 'Military training.', 'Savage Worlds Core'),
('Woodsman', 'PROFESSIONAL', 'Novice, Spirit d6+, Survival d8+', '+2 to Survival, Tracking', 'At home in the wilderness.', 'Savage Worlds Core'),

-- Social Edges
('Charismatic', 'SOCIAL', 'Novice, Spirit d8+', 'Free reroll on Persuasion', 'Extremely likeable.', 'Savage Worlds Core'),
('Connections', 'SOCIAL', 'Novice', 'Can call in favors from contacts', 'Knows the right people.', 'Savage Worlds Core'),
('Strong Willed', 'SOCIAL', 'Novice, Spirit d8+', '+2 to resist Taunt and Intimidation', 'Mentally tough.', 'Savage Worlds Core'),

-- Weird Edges (Deadlands)
('Grit', 'WEIRD', 'Novice', '+1 Grit, reduced Fear penalties', 'Seen enough horrors to be hardened.', 'Deadlands Core'),
('True Grit', 'WEIRD', 'Veteran, Grit', '+2 Grit total', 'Virtually fearless.', 'Deadlands Core');

-- =====================================================
-- HINDRANCES (Core Selection)
-- =====================================================
INSERT INTO hindrance_references (name, severity, effects, description, sourcebook) VALUES
('All Thumbs', 'MINOR', '-2 to use mechanical/electrical devices', 'Clumsy with technology.', 'Savage Worlds Core'),
('Anemic', 'MINOR', '-2 to resist Fatigue', 'Weak constitution.', 'Savage Worlds Core'),
('Arrogant', 'MAJOR', 'Must prove superiority, -2 Persuasion vs those of lower status', 'Considers themselves superior.', 'Savage Worlds Core'),
('Bad Eyes', 'MINOR', '-1 to all sight-based rolls', 'Poor vision (Minor can be corrected with glasses).', 'Savage Worlds Core'),
('Bad Luck', 'MAJOR', '-1 Benny per session', 'Chronically unlucky.', 'Savage Worlds Core'),
('Big Mouth', 'MINOR', 'Cannot keep secrets', 'Blabs everything.', 'Savage Worlds Core'),
('Blind', 'MAJOR', '-6 to all sight-based tasks', 'Cannot see.', 'Savage Worlds Core'),
('Bloodthirsty', 'MAJOR', 'Never takes prisoners', 'Shows no mercy.', 'Savage Worlds Core'),
('Cautious', 'MINOR', 'Overly careful', 'Always looks before leaping.', 'Savage Worlds Core'),
('Clueless', 'MAJOR', '-1 to Common Knowledge and Notice', 'Oblivious to surroundings.', 'Savage Worlds Core'),
('Code of Honor', 'MAJOR', 'Must follow personal code', 'Bound by strict ethics.', 'Savage Worlds Core'),
('Curious', 'MAJOR', 'Must investigate mysteries', 'Cannot resist a puzzle.', 'Savage Worlds Core'),
('Death Wish', 'MINOR', 'Seeks to die for a cause', 'Wants to go out in a blaze of glory.', 'Savage Worlds Core'),
('Delusional', 'MINOR', 'Believes something untrue', 'Has a minor false belief (Major for serious delusion).', 'Savage Worlds Core'),
('Doubting Thomas', 'MINOR', '-2 to resist supernatural Fear', 'Refuses to believe in supernatural.', 'Savage Worlds Core'),
('Elderly', 'MAJOR', 'Pace -1, -1 to Strength/Vigor', 'Advanced in years.', 'Savage Worlds Core'),
('Enemy', 'MINOR', 'Has a recurring foe', 'Someone wants them dead (Major for powerful enemy).', 'Savage Worlds Core'),
('Greedy', 'MINOR', 'Argues over money and treasure', 'Loves wealth (Major for uncontrollable greed).', 'Savage Worlds Core'),
('Habit', 'MINOR', 'Has an annoying habit', 'Annoying quirk (Major for addiction).', 'Savage Worlds Core'),
('Hard of Hearing', 'MINOR', '-4 to Notice sounds', 'Poor hearing (Major for Deaf).', 'Savage Worlds Core'),
('Heroic', 'MAJOR', 'Always helps those in need', 'Cannot refuse to help the innocent.', 'Savage Worlds Core'),
('Hesitant', 'MINOR', 'Draw two initiative cards, use lowest', 'Slow to act.', 'Savage Worlds Core'),
('Illiterate', 'MINOR', 'Cannot read or write', 'Never learned letters.', 'Savage Worlds Core'),
('Impulsive', 'MAJOR', 'Acts without thinking', 'Leap before look.', 'Savage Worlds Core'),
('Jealous', 'MINOR', 'Envious of others success', 'Cannot stand others doing better.', 'Savage Worlds Core'),
('Loyal', 'MINOR', 'Never betrays friends', 'Stands by companions.', 'Savage Worlds Core'),
('Mean', 'MINOR', '-1 to Persuasion', 'Cruel and ill-tempered.', 'Savage Worlds Core'),
('Mute', 'MAJOR', 'Cannot speak', 'Must communicate without words.', 'Savage Worlds Core'),
('Obligation', 'MINOR', 'Duty to an organization', 'Has responsibilities (Major for consuming obligation).', 'Savage Worlds Core'),
('One Arm', 'MAJOR', '-4 to tasks requiring two hands', 'Missing a limb.', 'Savage Worlds Core'),
('One Eye', 'MAJOR', '-2 to tasks requiring depth perception', 'Missing an eye.', 'Savage Worlds Core'),
('Outsider', 'MINOR', '-2 to Persuasion with majority culture', 'Different from the norm.', 'Savage Worlds Core'),
('Overconfident', 'MAJOR', 'Believes they can do anything', 'Underestimates challenges.', 'Savage Worlds Core'),
('Pacifist', 'MINOR', 'Will not harm innocents', 'Avoids violence when possible (Major won''t fight at all).', 'Savage Worlds Core'),
('Phobia', 'MINOR', '-1 to -2 when near fear source', 'Fear of something specific (Major for debilitating fear).', 'Savage Worlds Core'),
('Poverty', 'MINOR', 'Half starting funds', 'Chronically poor.', 'Savage Worlds Core'),
('Quirk', 'MINOR', 'Has a strange behavior', 'Minor eccentricity.', 'Savage Worlds Core'),
('Ruthless', 'MINOR', 'Will do anything to achieve goals', 'Ends justify means.', 'Savage Worlds Core'),
('Secret', 'MINOR', 'Has something to hide', 'Hides past or identity (Major for dangerous secret).', 'Savage Worlds Core'),
('Shamed', 'MINOR', 'Past disgrace haunts them', 'Carries old shame.', 'Savage Worlds Core'),
('Slow', 'MINOR', 'Pace -1', 'Moves slowly (Major for Pace -2, d4 running die).', 'Savage Worlds Core'),
('Small', 'MINOR', 'Size -1, Toughness -1', 'Below average size.', 'Savage Worlds Core'),
('Stubborn', 'MINOR', 'Never admits being wrong', 'Will argue any point.', 'Savage Worlds Core'),
('Suspicious', 'MINOR', 'Trusts no one', 'Always expects betrayal.', 'Savage Worlds Core'),
('Thin Skinned', 'MINOR', '-2 to resist Taunt', 'Easily insulted.', 'Savage Worlds Core'),
('Ugly', 'MINOR', '-1 to Persuasion', 'Unattractive.', 'Savage Worlds Core'),
('Vengeful', 'MINOR', 'Must get payback for slights', 'Holds grudges (Major for uncontrollable revenge).', 'Savage Worlds Core'),
('Vow', 'MINOR', 'Has made a promise', 'Bound by oath (Major for serious vow).', 'Savage Worlds Core'),
('Wanted', 'MINOR', 'Sought by authorities', 'Has a price on their head (Major for serious crime).', 'Savage Worlds Core'),
('Yellow', 'MAJOR', '-2 to Fear checks', 'Cowardly.', 'Savage Worlds Core'),
('Young', 'MAJOR', '3 fewer attribute points, 10 fewer skill points', 'Inexperienced youth.', 'Savage Worlds Core');

-- =====================================================
-- RACES
-- =====================================================
INSERT INTO race_references (name, abilities, description, sourcebook) VALUES
('Human', '+1 Edge at creation', 'The most common race in the Weird West.', 'Deadlands Core'),
('Indian', '+1 Edge at creation, start with Survival d4', 'Native American peoples with deep spiritual traditions.', 'Deadlands Core');

-- =====================================================
-- ARCANE BACKGROUNDS
-- =====================================================
INSERT INTO arcane_background_references (name, skill_name, starting_powers, starting_power_points, description, sourcebook) VALUES
('Blessed', 'Faith', 3, 15, 'Servants of a higher power who channel divine miracles.', 'Deadlands Core'),
('Huckster', 'Spellcasting', 3, 10, 'Gamblers who make deals with manitous for arcane power.', 'Deadlands Core'),
('Mad Scientist', 'Weird Science', 2, 15, 'Inventors who create ghost rock powered devices.', 'Deadlands Core'),
('Shaman', 'Focus', 2, 15, 'Those who commune with nature spirits for power.', 'Deadlands Core'),
('Chi Master', 'Focus', 3, 10, 'Martial artists who channel their inner chi.', 'Deadlands Core');
