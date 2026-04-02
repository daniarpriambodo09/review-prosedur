// data/procedures/all-procedures.ts
export type StatusType =
  | 'Revisi'
  | 'Relevan'
  | 'Obsolete'
  | 'Menunggu'
  | 'Belum dikirim'
  | 'Telah terkirim'
  | 'Telah dibaca'
  | '-';

export interface ProcedureDocument {
  id?: string;
  namaDokumen: string;
  nomorDokumen: string;
  levelDokumen: string;
  tanggalSelesaiApproval: string;
  revisi: string;
  owner: string;
  pic: string;
  email?: string;
  status: StatusType;
  isCustom?: boolean;
  deletedAt?: string;
}

// Fetch all procedures from API
export async function getAllProcedures(): Promise<ProcedureDocument[]> {
  try {
    const response = await fetch('/api/procedures', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch procedures');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching procedures:', error);
    return [];
  }
}

// Add new procedure
export async function addProcedure(doc: Omit<ProcedureDocument, 'status' | 'id'>): Promise<void> {
  try {
    const response = await fetch('/api/procedures', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(doc),
    });

    if (!response.ok) {
      throw new Error('Failed to add procedure');
    }
  } catch (error) {
    console.error('Error adding procedure:', error);
    throw error;
  }
}

// Get procedures by PIC
export async function getProceduresByPic(pic: string): Promise<ProcedureDocument[]> {
  try {
    const response = await fetch(`/api/procedures?pic=${encodeURIComponent(pic)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch procedures by PIC');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching procedures by PIC:', error);
    return [];
  }
}

// Save document review
export async function saveDocumentReview(
  nomorDokumen: string,
  status: StatusType,
  revisi: string,
  lastReviewedMonth: number
): Promise<void> {
  try {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nomorDokumen,
        status,
        revisi,
        lastReviewedMonth,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save review');
    }
  } catch (error) {
    console.error('Error saving review:', error);
    throw error;
  }
}

// Get document review
export async function getDocumentReview(
  nomorDokumen: string,
  month: number
): Promise<{ status: StatusType; revisi: string } | null> {
  try {
    const response = await fetch(
      `/api/reviews?nomorDokumen=${encodeURIComponent(nomorDokumen)}&month=${month}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data ? { status: data.status, revisi: data.revisi } : null;
  } catch (error) {
    console.error('Error fetching review:', error);
    return null;
  }
}

// Batch save reviews
export async function batchSaveReviews(
  reviews: Array<{
    nomorDokumen: string;
    status: StatusType;
    revisi: string;
    lastReviewedMonth: number;
  }>,
  username?: string
): Promise<void> {
  try {
    const response = await fetch('/api/reviews', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviews,
        username,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to batch save reviews');
    }
  } catch (error) {
    console.error('Error batch saving reviews:', error);
    throw error;
  }
}

// Archive (soft delete) procedure
export async function archiveProcedure(nomorDokumen: string): Promise<void> {
  try {
    const response = await fetch('/api/procedures/archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nomorDokumen }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to archive procedure');
    }
  } catch (error) {
    console.error('Error archiving procedure:', error);
    throw error;
  }
}

// Get all archived procedures
export async function getArchivedProcedures(): Promise<ProcedureDocument[]> {
  try {
    const response = await fetch('/api/arsip', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch archived procedures');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching archived procedures:', error);
    return [];
  }
}

// Restore archived procedure
export async function restoreProcedure(nomorDokumen: string): Promise<void> {
  try {
    const response = await fetch('/api/arsip/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nomorDokumen }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to restore procedure');
    }
  } catch (error) {
    console.error('Error restoring procedure:', error);
    throw error;
  }
}

// Delete procedure permanently
export async function deleteProcedurePermanently(nomorDokumen: string): Promise<void> {
  try {
    const response = await fetch('/api/arsip/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nomorDokumen }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete procedure permanently');
    }
  } catch (error) {
    console.error('Error deleting procedure permanently:', error);
    throw error;
  }
}

// Tandai dokumen telah dibaca oleh PIC
export async function markDocumentAsRead(
  nomorDokumen: string,
  pic: string
): Promise<void> {
  try {
    const response = await fetch('/api/document-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nomorDokumen, pic }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark document as read');
    }
  } catch (error) {
    console.error('Error marking document as read:', error);
    // Tidak throw error agar tidak mengganggu flow utama
  }
}