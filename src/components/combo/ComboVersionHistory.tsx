'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/components/ui/dialog';
import { ScrollArea } from '@/components/components/ui/scroll-area';
import { Badge } from '@/components/components/ui/badge';
import { Skeleton } from '@/components/components/ui/skeleton';
import { useToast } from '@/components/components/ui/toast';
import { useTranslation } from '@/lib/i18n/hooks';
import {
  getComboVersions,
  restoreComboVersion,
  deleteComboVersion,
  createComboVersion,
} from '@/server/actions/combo-version.actions';
import { History, RotateCcw, Trash2, Save, Calendar } from 'lucide-react';
// Format date helper function
function formatDateDistance(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'vor wenigen Sekunden';
  if (diffMins < 60) return `vor ${diffMins} Minute${diffMins > 1 ? 'n' : ''}`;
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  if (diffWeeks < 4) return `vor ${diffWeeks} Woche${diffWeeks > 1 ? 'n' : ''}`;
  if (diffMonths < 12) return `vor ${diffMonths} Monat${diffMonths > 1 ? 'en' : ''}`;
  return `vor ${diffYears} Jahr${diffYears > 1 ? 'en' : ''}`;
}

interface ComboVersionHistoryProps {
  comboId: string;
  onVersionRestored?: () => void;
}

interface ComboVersion {
  id: string;
  version: number;
  title: string;
  description: string | null;
  createdAt: Date;
  note: string | null;
  createdBy: string;
}

export function ComboVersionHistory({ comboId, onVersionRestored }: ComboVersionHistoryProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ComboVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const result = await getComboVersions(comboId);
      if (result.error) {
        addToast({
          variant: 'error',
          title: t('combo.versionHistory.loadFailed') || 'Fehler',
          description: result.error,
        });
      } else if (result.success && result.versions) {
        setVersions(result.versions as ComboVersion[]);
      }
    } catch (error) {
      addToast({
        variant: 'error',
        title: t('combo.versionHistory.loadFailed') || 'Fehler',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, comboId]);

  const handleCreateVersion = async () => {
    setIsCreating(true);
    try {
      const result = await createComboVersion(comboId);
      if (result.error) {
        addToast({
          variant: 'error',
          title: t('combo.versionHistory.createFailed') || 'Fehler',
          description: result.error,
        });
      } else {
        addToast({
          variant: 'success',
          title: t('combo.versionHistory.created') || 'Version erstellt',
          description:
            t('combo.versionHistory.createdDescription') ||
            'Die Version wurde erfolgreich erstellt',
        });
        await loadVersions();
      }
    } catch (error) {
      addToast({
        variant: 'error',
        title: t('combo.versionHistory.createFailed') || 'Fehler',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (
      !confirm(
        t('combo.versionHistory.restoreConfirm') ||
          'Möchtest du diese Version wirklich wiederherstellen? Die aktuelle Version wird als Backup gespeichert.'
      )
    ) {
      return;
    }

    setIsRestoring(version.toString());
    try {
      const result = await restoreComboVersion(comboId, version);
      if (result.error) {
        addToast({
          variant: 'error',
          title: t('combo.versionHistory.restoreFailed') || 'Fehler',
          description: result.error,
        });
      } else {
        addToast({
          variant: 'success',
          title: t('combo.versionHistory.restored') || 'Version wiederhergestellt',
          description:
            t('combo.versionHistory.restoredDescription') ||
            'Die Version wurde erfolgreich wiederhergestellt',
        });
        setOpen(false);
        onVersionRestored?.();
      }
    } catch (error) {
      addToast({
        variant: 'error',
        title: t('combo.versionHistory.restoreFailed') || 'Fehler',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDelete = async (version: number) => {
    if (
      !confirm(
        t('combo.versionHistory.deleteConfirm') || 'Möchtest du diese Version wirklich löschen?'
      )
    ) {
      return;
    }

    setIsDeleting(version.toString());
    try {
      const result = await deleteComboVersion(comboId, version);
      if (result.error) {
        addToast({
          variant: 'error',
          title: t('combo.versionHistory.deleteFailed') || 'Fehler',
          description: result.error,
        });
      } else {
        addToast({
          variant: 'success',
          title: t('combo.versionHistory.deleted') || 'Version gelöscht',
          description:
            t('combo.versionHistory.deletedDescription') ||
            'Die Version wurde erfolgreich gelöscht',
        });
        await loadVersions();
      }
    } catch (error) {
      addToast({
        variant: 'error',
        title: t('combo.versionHistory.deleteFailed') || 'Fehler',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          {t('combo.versionHistory.title') || 'Versionshistorie'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('combo.versionHistory.title') || 'Versionshistorie'}</DialogTitle>
          <DialogDescription>
            {t('combo.versionHistory.description') ||
              'Verwalte und stelle frühere Versionen deiner Kombo wieder her'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleCreateVersion} disabled={isCreating}>
              <Save className="mr-2 h-4 w-4" />
              {isCreating
                ? t('combo.versionHistory.creating') || 'Erstelle...'
                : t('combo.versionHistory.create') || 'Aktuelle Version speichern'}
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('combo.versionHistory.noVersions') || 'Noch keine Versionen vorhanden'}
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {t('combo.versionHistory.version') || 'Version'} {version.version}
                          </Badge>
                          {version.note && (
                            <span className="text-sm text-muted-foreground">{version.note}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold">{version.title}</h4>
                          {version.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {version.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDateDistance(new Date(version.createdAt))}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version.version)}
                          disabled={
                            isRestoring === version.version.toString() ||
                            isDeleting === version.version.toString()
                          }
                        >
                          <RotateCcw
                            className={`h-4 w-4 ${
                              isRestoring === version.version.toString() ? 'animate-spin' : ''
                            }`}
                          />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(version.version)}
                          disabled={
                            isRestoring === version.version.toString() ||
                            isDeleting === version.version.toString()
                          }
                        >
                          <Trash2
                            className={`h-4 w-4 ${
                              isDeleting === version.version.toString() ? 'animate-spin' : ''
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
