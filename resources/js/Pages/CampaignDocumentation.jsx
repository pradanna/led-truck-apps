import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Head, usePage } from '@inertiajs/react';
import {
  FolderKanban,
  Folder,
  FolderOpen,
  FolderPlus,
  Edit2,
  Plus,
  Video,
  Image as ImageIcon,
  Calendar,
  MapPin,
  User,
  Trash2,
  Play,
  Maximize2,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  Download,
  Filter,
  Eye,
  ChevronRight,
  ArrowLeft,
  LayoutGrid,
  Layers,
  MoreVertical
} from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';
import { SkeletonCampaignGrid } from '../Components/DashboardSkeleton';
import axios from 'axios';

export default function CampaignDocumentation({ documentations = [], folders = [], clients = [] }) {
  const { auth } = usePage().props;
  const isAdmin = auth?.user?.isAdmin ?? (auth?.user?.role === 'admin');

  const [docsList, setDocsList] = useState(documentations);
  const [dbFoldersList, setDbFoldersList] = useState(folders);
  const [filterType, setFilterType] = useState('all'); // 'all', 'image', 'video'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderDate, setSelectedFolderDate] = useState(null); // null = Folder view / all, or 'YYYY-MM-DD'
  const [viewMode, setViewMode] = useState('folder'); // 'folder' (Folder harian) or 'grid' (Semua file langsung)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Folder Modal State (Create / Edit Name)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderForm, setFolderForm] = useState({
    id: null,
    name: '',
    event_date: new Date().toISOString().split('T')[0],
    campaign_name: '',
    user_id: '',
    description: '',
  });
  const [isFolderSubmitting, setIsFolderSubmitting] = useState(false);

  // Modal Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    campaign_name: '',
    location: 'Jakarta Pusat (Bundaran HI)',
    event_date: new Date().toISOString().split('T')[0],
    user_id: '',
    folder_id: '',
    media_type: 'image',
    file: null,
    notes: '',
  });
  const [filePreview, setFilePreview] = useState(null);

  // Lightbox Media Player State
  const [activeMedia, setActiveMedia] = useState(null); // { url, type, title, campaign, location, date, client }
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenFolderModal = (folder = null) => {
    if (folder) {
      setFolderForm({
        id: folder.id,
        name: folder.name,
        event_date: folder.raw_event_date || new Date().toISOString().split('T')[0],
        campaign_name: folder.campaign_name || '',
        user_id: folder.client_id || '',
        description: folder.description || '',
      });
    } else {
      setFolderForm({
        id: null,
        name: `Dokumentasi ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        event_date: new Date().toISOString().split('T')[0],
        campaign_name: '',
        user_id: '',
        description: '',
      });
    }
    setIsFolderModalOpen(true);
  };

  const handleFolderSubmit = async (e) => {
    e.preventDefault();
    setIsFolderSubmitting(true);

    try {
      if (folderForm.id) {
        // Update / Rename Folder
        const res = await axios.put(`/api/campaign-folders/${folderForm.id}`, folderForm);
        if (res.data.success) {
          setDbFoldersList(dbFoldersList.map(f => f.id === folderForm.id ? { ...f, ...res.data.folder } : f));
          setIsFolderModalOpen(false);
          showToast(res.data.message);
        }
      } else {
        // Create New Folder
        const res = await axios.post('/api/campaign-folders', folderForm);
        if (res.data.success) {
          setDbFoldersList([res.data.folder, ...dbFoldersList]);
          setIsFolderModalOpen(false);
          showToast(res.data.message);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan folder.');
    } finally {
      setIsFolderSubmitting(false);
    }
  };

  const handleDeleteFolder = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Apakah Anda yakin ingin menghapus folder "${name}"? Dokumentasi di dalamnya akan tetap aman.`)) return;

    try {
      const res = await axios.delete(`/api/campaign-folders/${id}`);
      if (res.data.success) {
        setDbFoldersList(dbFoldersList.filter(f => f.id !== id));
        if (selectedFolderDate === id || selectedFolderDate === name) {
          setSelectedFolderDate(null);
        }
        showToast(res.data.message);
      }
    } catch (err) {
      alert('Gagal menghapus folder.');
    }
  };

  const handleOpenUploadModal = (folder = null) => {
    let folderDate = new Date().toISOString().split('T')[0];
    let folderId = '';
    if (folder) {
      if (typeof folder === 'object') {
        folderId = folder.id || '';
        folderDate = folder.raw_event_date || folderDate;
      } else if (typeof folder === 'string') {
        folderDate = folder;
        const found = dbFoldersList.find(f => f.raw_event_date === folder || String(f.id) === String(folder));
        if (found) folderId = found.id;
      }
    }

    setFormData({
      title: '',
      campaign_name: '',
      location: 'Jakarta Pusat (Bundaran HI)',
      event_date: folderDate,
      user_id: '',
      folder_id: folderId,
      media_type: 'image',
      file: null,
      notes: '',
    });
    setFilePreview(null);
    setUploadProgress(0);
    setModalError('');
    setIsUploadModalOpen(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
        setFormData((prev) => ({ ...prev, file, media_type: 'image' }));
      } else if (file.type.startsWith('video/')) {
        setFilePreview(URL.createObjectURL(file));
        setFormData((prev) => ({ ...prev, file, media_type: 'video' }));
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      setModalError('Silakan pilih file foto atau video dokumentasi.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setModalError('');

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('campaign_name', formData.campaign_name);
    payload.append('location', formData.location);
    payload.append('event_date', formData.event_date);
    payload.append('user_id', formData.user_id);
    if (formData.folder_id) payload.append('folder_id', formData.folder_id);
    payload.append('media_type', formData.media_type);
    payload.append('file', formData.file);
    payload.append('notes', formData.notes);

    try {
      const response = await axios.post('/api/campaigns', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      if (response.data.success) {
        const newDoc = response.data.documentation;
        const mappedDoc = {
          id: newDoc.id,
          folder_id: newDoc.folder_id,
          folder_name: newDoc.folder_name,
          title: newDoc.title,
          campaign_name: newDoc.campaign_name,
          location: newDoc.location || 'Jakarta Raya',
          event_date: new Date(newDoc.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          raw_event_date: newDoc.event_date ? newDoc.event_date.substring(0, 10) : new Date().toISOString().substring(0, 10),
          media_type: newDoc.media_type,
          file_url: newDoc.file_path,
          thumbnail_url: newDoc.thumbnail_path || newDoc.file_path,
          notes: newDoc.notes,
          client_name: clients.find(c => c.id === parseInt(newDoc.user_id))?.name || 'Semua Klien (Publik)',
          client_id: newDoc.user_id,
        };

        setDocsList([mappedDoc, ...docsList]);
        setIsUploadModalOpen(false);
        showToast(response.data.message || 'Dokumentasi berhasil diunggah!');
      } else {
        setModalError(response.data.message || 'Gagal mengunggah dokumentasi.');
      }
    } catch (error) {
      if (error.response?.status === 413) {
        setModalError('Ukuran file melebihi batas upload PHP server (413 Payload Too Large).');
      } else {
        setModalError(error.response?.data?.message || 'Terjadi kesalahan saat mengunggah file.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus dokumentasi "${title}"?`)) return;

    try {
      const res = await axios.delete(`/api/campaigns/${id}`);
      if (res.data.success) {
        setDocsList(docsList.filter(d => d.id !== id));
        showToast(res.data.message);
      }
    } catch (err) {
      alert('Gagal menghapus dokumentasi.');
    }
  };

  // Filter by Date Range first
  const dateFilteredDocs = docsList.filter((doc) => {
    const rawDate = doc.raw_event_date || (doc.event_date && doc.event_date !== '-' ? doc.event_date : null);
    if (!rawDate) return true;
    if (dateFrom && rawDate < dateFrom) return false;
    if (dateTo && rawDate > dateTo) return false;
    return true;
  });

  // Build Folders from DB Folders List
  const foldersMap = {};
  dbFoldersList.forEach((f) => {
    const key = `folder_${f.id}`;
    foldersMap[key] = {
      id: f.id,
      name: f.name,
      folderKey: key,
      formattedDate: f.event_date || f.raw_event_date,
      raw_event_date: f.raw_event_date,
      campaign_name: f.campaign_name,
      description: f.description,
      client_name: f.client_name,
      client_id: f.client_id,
      items: [],
      photoCount: 0,
      videoCount: 0,
      latestThumbnail: null,
    };
  });

  // Assign documentations to their respective folders
  const unassignedDocs = [];
  dateFilteredDocs.forEach((doc) => {
    if (doc.folder_id && foldersMap[`folder_${doc.folder_id}`]) {
      const targetFolder = foldersMap[`folder_${doc.folder_id}`];
      targetFolder.items.push(doc);
      if (doc.media_type === 'video') {
        targetFolder.videoCount++;
      } else {
        targetFolder.photoCount++;
      }
      if (!targetFolder.latestThumbnail && doc.thumbnail_url) {
        targetFolder.latestThumbnail = doc.thumbnail_url;
      }
    } else {
      unassignedDocs.push(doc);
    }
  });

  // Filter folders by date range
  const foldersList = Object.values(foldersMap)
    .filter(folder => {
      const fDate = folder.raw_event_date || folder.formattedDate;
      if (dateFrom && fDate && fDate < dateFrom) return false;
      if (dateTo && fDate && fDate > dateTo) return false;
      return true;
    })
    .sort((a, b) => (b.raw_event_date || '').localeCompare(a.raw_event_date || ''));

  // Selected folder items or all items
  const currentDocsScope = selectedFolderDate 
    ? (foldersMap[selectedFolderDate]?.items || [])
    : dateFilteredDocs;

  const currentActiveFolder = selectedFolderDate ? foldersMap[selectedFolderDate] : null;

  const filteredDocs = currentDocsScope.filter((doc) => {
    const matchesType = filterType === 'all' || doc.media_type === filterType;
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <AppLayout
      activeMenu="kampanye"
      title="Dokumentasi Kampanye & Galeri Media"
      subtitle={isAdmin ? "Kelola dan arsipkan foto & video penayangan kampanye klien" : "Galeri arsip penayangan materi kampanye brand Anda di jalan raya"}
      statusBadge={
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
          <FolderKanban className="w-3.5 h-3.5" />
          {isAdmin ? 'ADMINISTRATOR GALLERY' : 'CLIENT ARCHIVE'}
        </span>
      }
    >
      <Head title="Dokumentasi Kampanye - LED-FLX Fleet Control" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Galeri Dokumentasi On-The-Road
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Rekaman bukti tayang (Proof of Play) visual foto dan video armada truk LED yang diarsipkan rapi per hari operasional.
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
            <button
              onClick={() => {
                setViewMode('folder');
                setSelectedFolderDate(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'folder' && !selectedFolderDate
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              Folder Harian
            </button>
            <button
              onClick={() => {
                setViewMode('grid');
                setSelectedFolderDate(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Semua File ({docsList.length})
            </button>
          </div>

          {/* Action Buttons (Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenFolderModal(null)}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Buat Folder Baru"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Buat Folder</span>
              </button>

              <button
                onClick={() => handleOpenUploadModal(selectedFolderDate ? foldersMap[selectedFolderDate] : null)}
                className="px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Upload Media</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BREADCRUMB / FOLDER HEADER */}
      {selectedFolderDate && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFolderDate(null)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Daftar Folder</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              <span className="font-extrabold text-sm text-slate-900">
                {currentActiveFolder?.name || `Folder: ${currentActiveFolder?.formattedDate || selectedFolderDate}`}
              </span>
              <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold font-mono">
                {currentDocsScope.length} File
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && currentActiveFolder?.id && (
              <button
                onClick={() => handleOpenFolderModal(currentActiveFolder)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Ganti Nama Folder"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Ganti Nama Folder</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleOpenUploadModal(currentActiveFolder)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah ke Folder Ini
              </button>
            )}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Left: Type Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({currentDocsScope.length})
          </button>
          <button
            onClick={() => setFilterType('image')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterType === 'image'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Foto
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterType === 'video'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Video
          </button>
        </div>

        {/* Right: Date Range Filter & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setSelectedFolderDate(null);
              }}
              title="Dari Tanggal"
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs font-mono w-[115px]"
            />
            <span className="text-slate-400 font-bold text-xs">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setSelectedFolderDate(null);
              }}
              title="Sampai Tanggal"
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs font-mono w-[115px]"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                title="Hapus Filter Tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Cari kampanye / lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:bg-white focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW: FOLDER EXPLORER */}
      {viewMode === 'folder' && !selectedFolderDate && !searchTerm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span>Daftar Folder Kampanye ({foldersList.length} Folder)</span>
            </h3>
            <span className="text-xs text-slate-400">Klik folder untuk membuka galeri dokumentasi di dalamnya</span>
          </div>

          {foldersList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {foldersList.map((folder) => (
                <div
                  key={folder.folderKey}
                  onClick={() => setSelectedFolderDate(folder.folderKey)}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all p-5 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                >
                  {/* Top Actions & Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600 transition-all shadow-2xs">
                      <Folder className="w-6 h-6 fill-amber-400/30 group-hover:fill-blue-500/30" />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-2.5 py-1 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 text-slate-600 rounded-lg text-[10px] font-mono font-extrabold border border-slate-200 group-hover:border-blue-200 transition-colors">
                        {folder.items.length} Media
                      </span>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFolderModal(folder);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                          title="Ganti Nama Folder"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                      {folder.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{folder.formattedDate}</span>
                    </p>
                    {folder.campaign_name && (
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider truncate">
                        {folder.campaign_name}
                      </p>
                    )}
                  </div>

                  {/* Sub-counts details */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      {folder.photoCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                          {folder.photoCount}
                        </span>
                      )}
                      {folder.videoCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                          <Video className="w-3.5 h-3.5 text-emerald-500" />
                          {folder.videoCount}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                      Buka <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mx-auto">
                <FolderPlus className="w-8 h-8 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Belum Ada Folder Kampanye</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {isAdmin 
                    ? "Klik tombol 'Buat Folder' di atas untuk membuat folder khusus dokumentasi tayang kampanye Anda."
                    : "Belum ada folder dokumentasi tayang yang dibuat untuk akun Anda."}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleOpenFolderModal(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Buat Folder Sekarang</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* DOCUMENTATIONS GRID (Ketika masuk ke folder, atau mode grid semua file, atau sedang searching) */}
      {(viewMode === 'grid' || selectedFolderDate || searchTerm) && (
        isLoading ? (
          <SkeletonCampaignGrid />
        ) : filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Media Preview Card Header */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer">
                  {doc.media_type === 'image' ? (
                    <img
                      src={doc.file_url}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setActiveMedia(doc)}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center relative bg-slate-950"
                      onClick={() => setActiveMedia(doc)}
                    >
                      <video
                        src={doc.file_url}
                        className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-300"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Badge Media Type */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-sm">
                    {doc.media_type === 'video' ? (
                      <>
                        <Video className="w-3 h-3 text-emerald-400" /> VIDEO
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3 text-blue-400" /> FOTO
                      </>
                    )}
                  </span>

                  {/* Quick Expand Button */}
                  <button
                    onClick={() => setActiveMedia(doc)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Buka Layar Penuh"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-blue-600 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 truncate max-w-[150px]">
                      {doc.campaign_name}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {doc.event_date}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1 leading-snug" title={doc.title}>
                    {doc.title}
                  </h4>

                  <div className="space-y-1 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.location}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-slate-700">{doc.client_name}</span>
                    </div>
                  </div>

                  {doc.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 pt-1.5 border-t border-slate-100 mt-2">
                      {doc.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <button
                  onClick={() => setActiveMedia(doc)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Media</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={doc.file_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                    title="Unduh File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer"
                      title="Hapus Dokumentasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
            <FolderKanban className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {selectedFolderDate ? `Belum Ada Media di Folder ${foldersMap[selectedFolderDate]?.formattedDate || selectedFolderDate}` : 'Belum Ada Dokumentasi Kampanye'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {isAdmin 
                ? "Klik tombol 'Upload Baru' untuk mengunggah foto atau video rekaman tayang truk LED pada tanggal ini."
                : "Belum ada arsip foto/video dokumentasi penayangan yang dibagikan pada tanggal ini."}
            </p>
          </div>
        </div>
      ))}

      {/* LIGHTBOX MEDIA PLAYER MODAL (FOTO & VIDEO) */}
      {activeMedia && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] relative z-10">
            {/* Lightbox Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                  {activeMedia.campaign_name}
                </span>
                <h3 className="font-extrabold text-slate-900 text-base mt-1 truncate max-w-lg">
                  {activeMedia.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveMedia(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Media Body */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[350px]">
              {activeMedia.media_type === 'video' ? (
                <video
                  src={activeMedia.file_url}
                  controls
                  autoPlay
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : (
                <img
                  src={activeMedia.file_url}
                  alt={activeMedia.title}
                  className="max-h-[60vh] w-full object-contain"
                />
              )}
            </div>

            {/* Lightbox Meta Details Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Klien / Brand</span>
                  <span className="font-extrabold text-slate-800">{activeMedia.client_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lokasi Tayang</span>
                  <span className="font-bold text-slate-800">{activeMedia.location}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tanggal Dokumentasi</span>
                  <span className="font-mono font-bold text-slate-800">{activeMedia.event_date}</span>
                </div>
              </div>

              <a
                href={activeMedia.file_url}
                download
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Asli</span>
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* UPLOAD DOCUMENTATION MODAL (ADMIN ONLY) */}
      {isUploadModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto z-10">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <UploadCloud className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Upload Dokumentasi Kampanye
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unggah foto atau video penayangan armada dan tetapkan hak akses klien
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notification */}
            {modalError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Judul Dokumentasi
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Monitoring Tayangan Siang - Sudirman"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nama Kampanye / Event
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Brand Launching Q3"
                    value={formData.campaign_name}
                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Klien Pemilik Kampanye
                  </label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    <option value="">Semua Klien (Publik)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Masukkan ke Folder (Opsional)
                </label>
                <select
                  value={formData.folder_id}
                  onChange={(e) => setFormData({ ...formData, folder_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Tanpa Folder (Tampil di Semua File) --</option>
                  {dbFoldersList.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name} ({f.event_date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Lokasi Penayangan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jl. MH Thamrin / Bundaran HI"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tanggal Pengambilan
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload File Media */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  File Foto / Video Dokumentasi
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-center transition-colors bg-slate-50/60 relative cursor-pointer">
                  <input
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <UploadCloud className="w-8 h-8 text-blue-500" />
                    <div className="text-xs font-bold text-slate-800">
                      {formData.file ? formData.file.name : 'Pilih Foto (JPG/PNG) atau Video (MP4/MOV)'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Ukuran maksimal file: 150 MB
                    </p>
                  </div>
                </div>

                {filePreview && formData.media_type === 'image' && (
                  <div className="mt-2 p-2 rounded-xl border border-slate-200 bg-white inline-block">
                    <img src={filePreview} alt="Preview" className="h-24 rounded-lg object-cover" />
                  </div>
                )}
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Catatan Operasional (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi lalu lintas, jam tayang, atau sudut pandang kamera..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Upload Progress Bar */}
              {isSubmitting && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                      {uploadProgress < 100 ? 'Mengunggah file ke server...' : 'Memproses & Mengoptimalkan file...'}
                    </span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/30 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Mengunggah...' : 'Simpan & Publikasikan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE / RENAME FOLDER MODAL (ADMIN ONLY) */}
      {isFolderModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto z-10">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <FolderPlus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {folderForm.id ? 'Ubah Nama Folder' : 'Buat Folder Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {folderForm.id ? 'Perbarui nama dan rincian folder dokumentasi' : 'Kelompokkan dokumentasi tayang ke dalam folder khusus'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFolderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nama Folder
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hari 1 - Bundaran HI & Sudirman"
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tanggal Operasional
                  </label>
                  <input
                    type="date"
                    required
                    value={folderForm.event_date}
                    onChange={(e) => setFolderForm({ ...folderForm, event_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nama Kampanye / Event
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Brand Launching"
                    value={folderForm.campaign_name}
                    onChange={(e) => setFolderForm({ ...folderForm, campaign_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Klien Tertarget (Opsional)
                </label>
                <select
                  value={folderForm.user_id}
                  onChange={(e) => setFolderForm({ ...folderForm, user_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="">Semua Klien (Publik)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Keterangan Folder (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan rute atau deskripsi folder..."
                  value={folderForm.description}
                  onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isFolderSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/30 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {isFolderSubmitting ? 'Menyimpan...' : (folderForm.id ? 'Simpan Nama' : 'Buat Folder')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
