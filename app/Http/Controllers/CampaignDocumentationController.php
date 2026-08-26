<?php

namespace App\Http\Controllers;

use App\Models\CampaignDocumentation;
use App\Models\CampaignFolder;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class CampaignDocumentationController extends Controller
{
    /**
     * Display list of Campaign Documentations and Folders (Filtered by Client if non-admin)
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();

        // 1. Fetch Folders
        $folderQuery = CampaignFolder::with('client:id,name,email')
            ->withCount('documentations')
            ->latest('event_date')
            ->latest('id');

        if (!$isAdmin) {
            $folderQuery->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        }

        $folders = $folderQuery->get()->map(function ($folder) {
            return [
                'id' => $folder->id,
                'name' => $folder->name,
                'event_date' => $folder->event_date ? $folder->event_date->translatedFormat('d M Y') : '-',
                'raw_event_date' => $folder->event_date ? $folder->event_date->format('Y-m-d') : null,
                'campaign_name' => $folder->campaign_name,
                'description' => $folder->description,
                'documentations_count' => $folder->documentations_count,
                'client_name' => $folder->client ? $folder->client->name : 'Semua Klien (Publik)',
                'client_id' => $folder->user_id,
            ];
        });

        // 2. Fetch Documentations
        $query = CampaignDocumentation::with(['client:id,name,email', 'folder:id,name'])
            ->latest('event_date')
            ->latest('id');

        if (!$isAdmin) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        }

        $documentations = $query->get()->map(function ($doc) {
            return [
                'id' => $doc->id,
                'folder_id' => $doc->folder_id,
                'folder_name' => $doc->folder ? $doc->folder->name : null,
                'title' => $doc->title,
                'campaign_name' => $doc->campaign_name,
                'location' => $doc->location ?? 'Jakarta Raya',
                'event_date' => $doc->event_date ? $doc->event_date->translatedFormat('d M Y') : '-',
                'raw_event_date' => $doc->event_date ? $doc->event_date->format('Y-m-d') : null,
                'media_type' => $doc->media_type,
                'file_url' => $doc->file_path,
                'thumbnail_url' => $doc->thumbnail_path ?: $doc->file_path,
                'notes' => $doc->notes,
                'client_name' => $doc->client ? $doc->client->name : 'Semua Klien (Publik)',
                'client_id' => $doc->user_id,
            ];
        });

        // List of clients for admin dropdown
        $clients = [];
        if ($isAdmin) {
            $clients = User::where('role', 'user')
                ->select('id', 'name', 'email')
                ->get();
        }

        return Inertia::render('CampaignDocumentation', [
            'documentations' => $documentations,
            'folders' => $folders,
            'clients' => $clients,
        ]);
    }

    /**
     * Create or Auto-Find Folder by Date / Name
     */
    public function storeFolder(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'event_date' => 'required|date',
            'campaign_name' => 'nullable|string|max:255',
            'user_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string|max:1000',
        ]);

        $folder = CampaignFolder::create([
            'user_id' => $request->filled('user_id') ? $request->input('user_id') : null,
            'name' => $request->input('name'),
            'event_date' => $request->input('event_date'),
            'campaign_name' => $request->input('campaign_name'),
            'description' => $request->input('description'),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Folder '{$folder->name}' berhasil dibuat!",
            'folder' => [
                'id' => $folder->id,
                'name' => $folder->name,
                'event_date' => $folder->event_date ? $folder->event_date->translatedFormat('d M Y') : '-',
                'raw_event_date' => $folder->event_date ? $folder->event_date->format('Y-m-d') : null,
                'campaign_name' => $folder->campaign_name,
                'description' => $folder->description,
                'documentations_count' => 0,
                'client_name' => $folder->client ? $folder->client->name : 'Semua Klien (Publik)',
                'client_id' => $folder->user_id,
            ],
        ]);
    }

    /**
     * Rename / Update Folder
     */
    public function updateFolder(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'event_date' => 'nullable|date',
            'campaign_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $folder = CampaignFolder::findOrFail($id);
        $folder->update($request->only(['name', 'event_date', 'campaign_name', 'description']));

        return response()->json([
            'success' => true,
            'message' => "Nama folder berhasil diperbarui menjadi '{$folder->name}'!",
            'folder' => [
                'id' => $folder->id,
                'name' => $folder->name,
                'event_date' => $folder->event_date ? $folder->event_date->translatedFormat('d M Y') : '-',
                'raw_event_date' => $folder->event_date ? $folder->event_date->format('Y-m-d') : null,
                'campaign_name' => $folder->campaign_name,
                'description' => $folder->description,
            ],
        ]);
    }

    /**
     * Delete Folder
     */
    public function destroyFolder($id)
    {
        $folder = CampaignFolder::findOrFail($id);
        $folderName = $folder->name;
        $folder->delete();

        return response()->json([
            'success' => true,
            'message' => "Folder '{$folderName}' berhasil dihapus!",
        ]);
    }

    /**
     * Upload & Store new Campaign Documentation (Single or Bulk Files) (Admin Only)
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'nullable|string|max:255',
            'campaign_name' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'event_date' => 'required|date',
            'user_id' => 'nullable|exists:users,id',
            'folder_id' => 'nullable|exists:campaign_folders,id',
            'media_type' => 'nullable|in:image,video',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,webp,mp4,mov,webm|max:153600', // 150MB max
            'files' => 'nullable|array',
            'files.*' => 'file|mimes:jpg,jpeg,png,webp,mp4,mov,webm|max:153600',
            'notes' => 'nullable|string|max:1000',
        ]);

        $uploadDir = public_path('uploads/campaigns');
        if (!File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        // Kumpulkan file: baik dari array 'files' maupun single 'file'
        $uploadedFiles = [];
        if ($request->hasFile('files')) {
            $uploadedFiles = $request->file('files');
        } elseif ($request->hasFile('file')) {
            $uploadedFiles = [$request->file('file')];
        }

        if (empty($uploadedFiles)) {
            return response()->json([
                'success' => false,
                'message' => 'Silakan pilih setidaknya satu file foto atau video untuk diunggah.',
            ], 422);
        }

        // Ambil info folder jika ada
        $folderId = $request->filled('folder_id') ? $request->input('folder_id') : null;
        $folder = $folderId ? CampaignFolder::find($folderId) : null;
        $folderName = $folder ? $folder->name : null;

        // Hitung dokumen yang sudah ada di folder untuk penomoran urut lanjutan
        $existingCount = 0;
        if ($folderId) {
            $existingCount = CampaignDocumentation::where('folder_id', $folderId)->count();
        }

        $baseTitle = trim($request->input('title', ''));
        $createdDocs = [];
        $totalFiles = count($uploadedFiles);

        foreach ($uploadedFiles as $index => $file) {
            $extension = strtolower($file->getClientOriginalExtension());
            $mime = $file->getMimeType() ?? '';
            $isImage = in_array($extension, ['jpg', 'jpeg', 'png', 'webp']) || str_starts_with($mime, 'image/');
            $mediaType = $isImage ? 'image' : 'video';

            if ($isImage) {
                $fileName = \App\Services\ImageOptimizerService::compressAndSave(
                    $file,
                    $uploadDir,
                    time() . '_' . uniqid() . '.' . $extension,
                    1920,
                    1080,
                    80
                );
            } else {
                $fileName = time() . '_' . uniqid() . '.' . $extension;
                $file->move($uploadDir, $fileName);
            }

            $filePath = '/uploads/campaigns/' . $fileName;

            // Generate judul otomatis:
            // 1. Jika di dalam folder: "[Nama Folder] - [Nomor Urut 2 Digit]" (atau jika baseTitle diisi, gunakan baseTitle + nomor urut)
            // 2. Jika tanpa folder & upload masal: "[Base Title / Campaign Name] - [Nomor Urut]"
            // 3. Jika single file & baseTitle diisi: gunakan baseTitle langsung
            $seqNumber = str_pad($existingCount + $index + 1, 2, '0', STR_PAD_LEFT);
            if ($folderName) {
                $docTitle = $baseTitle ?: "{$folderName} - {$seqNumber}";
                if ($baseTitle && $totalFiles > 1) {
                    $docTitle = "{$baseTitle} - {$seqNumber}";
                }
            } else {
                if ($totalFiles > 1) {
                    $prefix = $baseTitle ?: ($request->input('campaign_name') . ' Dokumentasi');
                    $docTitle = "{$prefix} - {$seqNumber}";
                } else {
                    $docTitle = $baseTitle ?: ($request->input('campaign_name') . ' Dokumentasi');
                }
            }

            $doc = CampaignDocumentation::create([
                'user_id' => $request->filled('user_id') ? $request->input('user_id') : ($folder ? $folder->user_id : null),
                'folder_id' => $folderId,
                'title' => $docTitle,
                'campaign_name' => $request->input('campaign_name') ?: ($folder ? $folder->campaign_name : 'Dokumentasi Kampanye'),
                'location' => $request->input('location') ?: 'Jakarta Raya',
                'event_date' => $request->input('event_date') ?: ($folder ? $folder->event_date : today()),
                'media_type' => $mediaType,
                'file_path' => $filePath,
                'thumbnail_path' => $mediaType === 'image' ? $filePath : null,
                'notes' => $request->input('notes'),
            ]);

            // Format response object agar langsung siap di-render di frontend state
            $createdDocs[] = [
                'id' => $doc->id,
                'folder_id' => $doc->folder_id,
                'folder_name' => $folderName,
                'title' => $doc->title,
                'campaign_name' => $doc->campaign_name,
                'location' => $doc->location ?? 'Jakarta Raya',
                'event_date' => $doc->event_date ? $doc->event_date->translatedFormat('d M Y') : '-',
                'raw_event_date' => $doc->event_date ? $doc->event_date->format('Y-m-d') : null,
                'media_type' => $doc->media_type,
                'file_url' => $doc->file_path,
                'thumbnail_url' => $doc->thumbnail_path ?: $doc->file_path,
                'notes' => $doc->notes,
                'client_name' => $doc->client ? $doc->client->name : 'Semua Klien (Publik)',
                'client_id' => $doc->user_id,
            ];
        }

        $message = count($createdDocs) > 1
            ? count($createdDocs) . ' file dokumentasi berhasil diunggah secara masal!'
            : 'Dokumentasi kampanye berhasil diunggah dan disimpan!';

        return response()->json([
            'success' => true,
            'message' => $message,
            'documentations' => $createdDocs,
            'documentation' => $createdDocs[0] ?? null,
        ]);
    }

    /**
     * Delete Campaign Documentation (Admin Only)
     */
    public function destroy($id)
    {
        $doc = CampaignDocumentation::findOrFail($id);

        // Delete physical file if exists
        $fullPath = public_path(ltrim($doc->file_path, '/'));
        if (File::exists($fullPath)) {
            File::delete($fullPath);
        }

        $doc->delete();

        return response()->json([
            'success' => true,
            'message' => 'Dokumentasi kampanye berhasil dihapus!'
        ]);
    }
}

