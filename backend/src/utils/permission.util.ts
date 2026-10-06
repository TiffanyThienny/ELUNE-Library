import { Visibility, BookStatus, Role } from '@prisma/client';

export interface UserContext {
  id: string;
  role: Role;
}

export interface BookPermissionContext {
  id?: string;
  visibility: Visibility;
  status: BookStatus;
  uploadedBy?: string | null;
}

/**
 * MASTER BOOK ACCESS CONTROL
 *
 * Matrix:
 * | Uploader | Visibility | Status   | Admin | Uploader | Other Users | Explore |
 * | ADMIN    | PUBLIC     | APPROVED |   ✅   |    ✅    |     ✅      |   ✅    |
 * | USER     | PUBLIC     | PENDING  |   ✅   |    ✅    |     ❌      |   ❌    |
 * | USER     | PUBLIC     | APPROVED |   ✅   |    ✅    |     ✅      |   ✅    |
 * | USER     | PUBLIC     | REJECTED |   ✅   |    ✅    |     ❌      |   ❌    |
 * | USER     | PRIVATE    | APPROVED |   ✅*  |    ✅    |     ❌      |   ❌    |
 */
export function canUserAccessBook(
  book: BookPermissionContext,
  user?: UserContext | null
): boolean {
  // 1. PUBLIC + APPROVED books can be accessed by anyone (readers, uploaders, admins, guests)
  if (book.visibility === Visibility.PUBLIC && book.status === BookStatus.APPROVED) {
    return true;
  }

  // 2. Any other condition requires an authenticated user
  if (!user) {
    return false;
  }

  // 3. Admin can access all books (for administrative review / console)
  if (user.role === Role.ADMIN) {
    return true;
  }

  // 4. Uploader can access their own book (whether PRIVATE, PENDING, REJECTED, or DRAFT)
  if (book.uploadedBy && book.uploadedBy === user.id) {
    return true;
  }

  // 5. All other cases are strictly forbidden
  return false;
}

/**
 * Determine upload parameters strictly based on authenticated user's role.
 * Never trust client-provided role, status, or uploader ID.
 */
export function resolveBookUploadStatus(
  user: UserContext,
  requestedVisibility?: string
): { visibility: Visibility; status: BookStatus } {
  // ADMIN UPLOAD -> ALWAYS PUBLIC, ALWAYS APPROVED
  if (user.role === Role.ADMIN) {
    return {
      visibility: Visibility.PUBLIC,
      status: BookStatus.APPROVED
    };
  }

  // USER UPLOAD + PUBLIC -> APPROVED (immediately visible in public catalog)
  if (String(requestedVisibility).toUpperCase() === 'PUBLIC') {
    return {
      visibility: Visibility.PUBLIC,
      status: BookStatus.APPROVED
    };
  }

  // USER UPLOAD + PRIVATE -> APPROVED (immediate owner access, private)
  return {
    visibility: Visibility.PRIVATE,
    status: BookStatus.APPROVED
  };
}
