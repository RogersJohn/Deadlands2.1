/**
 * CharacterSheetsManager Component (Phase 2.5a)
 *
 * Main view for managing character sheets.
 * Displays list of characters with create/edit/delete functionality.
 */

import { type ReactElement, useState, useEffect } from 'react';
import type { CharacterSheet, CharacterSheetCreate } from '../../types/CharacterSheet';
import { characterSheetService } from '../../services/characterSheetService';
import { CharacterSheetForm } from './CharacterSheetForm';
import { CharacterSheetCard } from './CharacterSheetCard';
import { colors, spacing, typography, borderRadius, componentStyles } from '../shared/styles';

export type CharacterSheetsManagerProps = {
  // Empty for now - could add callbacks for external integration
};

type ViewState =
  | { readonly mode: 'list' }
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly characterId: string };

export function CharacterSheetsManager(_props: CharacterSheetsManagerProps): ReactElement {
  const [characters, setCharacters] = useState<readonly CharacterSheet[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ mode: 'list' });

  // Load characters on mount
  useEffect(() => {
    setCharacters(characterSheetService.getAll());
  }, []);

  function handleCreate(data: CharacterSheetCreate): void {
    characterSheetService.create(data);
    setCharacters(characterSheetService.getAll());
    setViewState({ mode: 'list' });
  }

  function handleEdit(data: CharacterSheetCreate): void {
    if (viewState.mode !== 'edit') return;
    characterSheetService.update(viewState.characterId, data);
    setCharacters(characterSheetService.getAll());
    setViewState({ mode: 'list' });
  }

  function handleDelete(id: string): void {
    characterSheetService.delete(id);
    setCharacters(characterSheetService.getAll());
  }

  function handleEditClick(id: string): void {
    setViewState({ mode: 'edit', characterId: id });
  }

  function handleCancel(): void {
    setViewState({ mode: 'list' });
  }

  const editingCharacter =
    viewState.mode === 'edit'
      ? characters.find((c) => c.id === viewState.characterId)
      : undefined;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.heading}>Character Sheets</h2>
        <p style={styles.subheading}>
          Non-authoritative reference data for assistant context.
        </p>
      </header>

      {viewState.mode === 'list' && (
        <>
          <button
            type="button"
            onClick={() => setViewState({ mode: 'create' })}
            style={componentStyles.button}
          >
            + New Character
          </button>

          <div style={styles.list}>
            {characters.length === 0 ? (
              <p style={componentStyles.emptyState}>
                No character sheets yet. Create one to get started.
              </p>
            ) : (
              characters.map((character) => (
                <CharacterSheetCard
                  key={character.id}
                  character={character}
                  onEdit={handleEditClick}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </>
      )}

      {viewState.mode === 'create' && (
        <CharacterSheetForm onSubmit={handleCreate} onCancel={handleCancel} />
      )}

      {viewState.mode === 'edit' && editingCharacter && (
        <CharacterSheetForm
          initialData={editingCharacter}
          onSubmit={handleEdit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: spacing.xl,
    maxWidth: '800px',
  },
  header: {
    marginBottom: spacing.xxl,
  },
  heading: {
    margin: `0 0 ${spacing.sm} 0`,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  subheading: {
    margin: 0,
    color: colors.textMuted,
    fontSize: typography.fontSize.base,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
};
