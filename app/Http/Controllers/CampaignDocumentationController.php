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
     * Upload & Store new Campaign Documentation (Admin Only)
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'campaign_name' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'event_date' => 'required|date',
            'user_id' => 'nullable|exists:users,id',
            'folder_id' => 'nullable|exists:campaign_folders,id',
            'media_type' => 'required|in:image,video',
            'file' => 'required|file|mimes:jpg,jpeg,png,webp,mp4,mov,webm|max:153600', // 150MB max
            'notes' => 'nullable|string|max:1000',
        ]);

        $uploadDir = public_path('uploads/campaigns');
        if (!File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $isImage = in_array($extension, ['jpg', 'jpeg', 'png', 'webp']) || str_starts_with($file->getMimeType() ?? '', 'image/');

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

        $doc = CampaignDocumentation::create([
            'user_id' => $request->filled('user_id') ? $request->input('user_id') : null,
            'folder_id' => $request->filled('folder_id') ? $request->input('folder_id') : null,
            'title' => $request->input('title'),
            'campaign_name' => $request->input('campaign_name'),
            'location' => $request->input('location'),
            'event_date' => $request->input('event_date'),
            'media_type' => $request->input('media_type'),
            'file_path' => $filePath,
            'thumbnail_path' => $request->input('media_type') === 'image' ? $filePath : null,
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dokumentasi kampanye berhasil diunggah dan disimpan!',
            'documentation' => $doc,
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

