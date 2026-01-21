/**
 * CharacterContext Component (Phase 2.5b)
 *
 * Panel containing Actor and Target character selectors.
 * When characters are selected, injects descriptive text into input.
 *
 * CRITICAL: Text injection ONLY. No structured data passed to assistant.
 * The injected text is the complete interface - the assistant sees ONLY
 * the natural language input, not structured character data.
 */

import { type ReactElement, useState, useEffect } from 'react';
import type { CharacterSheet } from '../../types/CharacterSheet';
import { characterSheetService } from '../../services/characterSheetService';
import { CharacterSelector, generateCharacterText } from './CharacterSelector';
import { colors, spacing, typography, borderRadius } from '../shared/styles';

export type CharacterContextProps = {
  readonly onInjectText: (text: string) => void;
  readonly disabled?: boolean;
};

export function CharacterContext({
  onInjectText,
  disabled = false,
}: CharacterContextProps): ReactElement {
  const [characters, setCharacters] = useState<readonly CharacterSheet[]>([]);
  const [actorId, setActorId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  // Load characters on mount
  useEffect(() => {
    setCharacters(characterSheetService.getAll());
  }, []);

  // Refresh characters when the list might have changed
  // (e.g., when user navigates back from character management)
  useEffect(() => {
    function handleFocus(): void {
      setCharacters(characterSheetService.getAll());
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  function handleActorSelect(character: CharacterSheet | null): void {
    if (character) {
      setActorId(character.id);
      const text = generateCharacterText(character, 'actor');
      if (text) {
        onInjectText(text);
      }
    } else {
      setActorId(null);
    }
  }

  function handleTargetSelect(character: CharacterSheet | null): void {
    if (character) {
      setTargetId(character.id);
      const text = generateCharacterText(character, 'target');
      if (text) {
        onInjectText(text);
      }
    } else {
      setTargetId(null);
    }
  }

  if (characters.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.emptyText}>
          No character sheets available.{' '}
          <a href="#characters" style={styles.link}>
            Create some
          </a>{' '}
          to use context injection.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <p style={styles.description}>
        Select characters to inject their descriptions into the input.
      </p>
      <div style={styles.selectors}>
        <CharacterSelector
          label="Acting Character"
          characters={characters}
          selectedId={actorId}
          onSelect={handleActorSelect}
          disabled={disabled}
        />
        <CharacterSelector
          label="Target Character"
          characters={characters}
          selectedId={targetId}
          onSelect={handleTargetSelect}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    background: colors.bgDarker,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderDark}`,
  },
  description: {
    margin: `0 0 ${spacing.md} 0`,
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  selectors: {
    display: 'flex',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  emptyText: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  link: {
    color: colors.textSecondary,
    textDecoration: 'underline',
  },
};
