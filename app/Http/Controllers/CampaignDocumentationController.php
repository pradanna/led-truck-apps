<?php

namespace App\Http\Controllers;

use App\Models\CampaignDocumentation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class CampaignDocumentationController extends Controller
{
    /**
     * Display list of Campaign Documentations (Filtered by Client if non-admin)
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();

        $query = CampaignDocumentation::with('client:id,name,email')
            ->latest('event_date')
            ->latest('id');

        // If client user, only show documentations assigned to them or public
        if (!$isAdmin) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        }

        $documentations = $query->get()->map(function ($doc) {
            return [
                'id' => $doc->id,
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

        // List of clients for admin upload dropdown
        $clients = [];
        if ($isAdmin) {
            $clients = User::where('role', 'user')
                ->select('id', 'name', 'email')
                ->get();
        }

        return Inertia::render('CampaignDocumentation', [
            'documentations' => $documentations,
            'clients' => $clients,
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
            // Compress & resize image automatically (Max 1920x1080, 80% quality)
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
