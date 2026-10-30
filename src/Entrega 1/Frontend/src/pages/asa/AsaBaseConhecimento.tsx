import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Search, FileText, Eye, Clock, Upload, Plus, Trash2, Download, Cloud, 
  CheckCircle2, Sparkles, AlertCircle, FileUp, X, BrainCircuit, RefreshCw
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatRelative, cn } from '../../lib/utils';

export default function AsaBaseConhecimento() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [viewDocModal, setViewDocModal] = useState<any>(null);

  // Form states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Acadêmico');
  const [docContent, setDocContent] = useState('');
  const [docTags, setDocTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['todas', 'Matrícula', 'Financeiro', 'Acadêmico', 'Bolsas & Financiamento', 'Secretaria', 'Geral'];

  const LOCAL_CUSTOM_DOCS_KEY = 'asaia_custom_kb_documents';

  const getLocalCustomDocs = (): any[] => {
    try {
      const raw = localStorage.getItem(LOCAL_CUSTOM_DOCS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveLocalCustomDoc = (doc: any) => {
    try {
      const existing = getLocalCustomDocs();
      const updated = [doc, ...existing.filter((d: any) => d.id !== doc.id && d.title !== doc.title)];
      localStorage.setItem(LOCAL_CUSTOM_DOCS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar documento em cache local:', e);
    }
  };

  const removeLocalCustomDoc = (id: string) => {
    try {
      const existing = getLocalCustomDocs();
      localStorage.setItem(LOCAL_CUSTOM_DOCS_KEY, JSON.stringify(existing.filter((d: any) => d.id !== id)));
    } catch (e) {}
  };

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      let list = await api.kb.list({
        category: selectedCategory !== 'todas' ? selectedCategory : undefined,
        search: search.trim() || undefined,
      }).catch(() => []);

      const localCustomDocs = getLocalCustomDocs();

      // Sincronização inteligente: se o Render reiniciou o SQLite para o seed padrão,
      // re-injeta automaticamente os documentos customizados salvos pelo atendente
      if (list && list.length > 0) {
        for (const localDoc of localCustomDocs) {
          const existsOnBackend = list.some((d: any) => d.title.trim().toLowerCase() === localDoc.title.trim().toLowerCase());
          if (!existsOnBackend) {
            try {
              const recreated = await api.kb.create({
                title: localDoc.title,
                category: localDoc.category,
                content: localDoc.content,
                tags: localDoc.tags,
              });
              list = [recreated, ...list];
            } catch (syncErr) {
              list = [localDoc, ...list];
            }
          }
        }
      } else if (localCustomDocs.length > 0) {
        list = [...localCustomDocs];
      }

      setDocuments(list);
    } catch (err) {
      console.error('Erro ao buscar base de conhecimento:', err);
      const fallback = getLocalCustomDocs();
      if (fallback.length) setDocuments(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadErrorMsg('Por favor, selecione um arquivo (PDF, TXT ou MD).');
      return;
    }

    setIsSubmitting(true);
    setUploadErrorMsg('');
    setUploadSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const chosenTitle = docTitle.trim() || uploadFile.name.replace(/\.[^/.]+$/, '');
      formData.append('title', chosenTitle);
      formData.append('category', docCategory);

      // Lê uma prévia textual caso seja txt ou md
      let textContent = `Documento institucional: ${chosenTitle} (${uploadFile.name}).`;
      if (uploadFile.type === 'text/plain' || uploadFile.name.endsWith('.txt') || uploadFile.name.endsWith('.md')) {
        try {
          textContent = await uploadFile.text();
        } catch (e) {}
      }

      const res = await api.kb.upload(formData);
      saveLocalCustomDoc({
        id: res?.document?.id || `upload-${Date.now()}`,
        title: chosenTitle,
        category: docCategory,
        content: textContent,
        author: 'Equipe ASA',
        source: 'upload',
        filename: uploadFile.name,
        indexed: true,
        tags: [docCategory.toLowerCase(), 'institucional', 'upload'],
        createdAt: new Date().toISOString(),
      });

      setUploadSuccessMsg(res.message || 'Documento indexado com sucesso no RAG!');
      setUploadFile(null);
      setDocTitle('');
      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadSuccessMsg('');
        fetchDocuments();
      }, 1000);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setUploadErrorMsg(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) {
      setUploadErrorMsg('Título e conteúdo são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setUploadErrorMsg('');

    try {
      const tagsArray = docTags.split(',').map(t => t.trim()).filter(Boolean);
      const newDoc = await api.kb.create({
        title: docTitle.trim(),
        category: docCategory,
        content: docContent.trim(),
        tags: tagsArray,
      });

      saveLocalCustomDoc(newDoc || {
        id: `manual-${Date.now()}`,
        title: docTitle.trim(),
        category: docCategory,
        content: docContent.trim(),
        tags: tagsArray,
        author: 'Equipe ASA',
        source: 'manual',
        indexed: true,
        createdAt: new Date().toISOString(),
      });

      setDocTitle('');
      setDocContent('');
      setDocTags('');
      setManualModalOpen(false);
      fetchDocuments();
    } catch (err: any) {
      console.error('Erro ao criar artigo manual:', err);
      setUploadErrorMsg(err.message || 'Erro ao salvar artigo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover este documento da Base de Conhecimento do Álvaro AI?')) return;
    try {
      removeLocalCustomDoc(id);
      await api.kb.delete(id);
      fetchDocuments();
    } catch (err) {
      console.error('Erro ao deletar documento:', err);
      removeLocalCustomDoc(id);
      fetchDocuments();
    }
  };

  const totalIndexed = documents.filter(d => d.indexed).length;
  const totalUploads = documents.filter(d => d.source === 'upload').length;
  const totalViews = documents.reduce((acc, d) => acc + (d.views || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Base de Conhecimento RAG</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border border-brand-200 dark:border-brand-800 flex items-center gap-1">
              <BrainCircuit size={13} /> IA Ativa
            </span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Suba documentos institucionais (PDFs, Manuais, Editais) para o Álvaro AI responder com fidelidade aos alunos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setUploadErrorMsg(''); setUploadModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Upload size={16} /> Subir Documento / PDF
          </button>
          <button 
            onClick={() => { setUploadErrorMsg(''); setManualModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Plus size={16} /> Novo Artigo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total de Documentos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{documents.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">{totalUploads} arquivos PDF/doc indexados</p>
          </div>
          <BookOpen className="w-8 h-8 text-blue-500 opacity-80" />
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Indexados no RAG</p>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">{totalIndexed}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">100% prontos para consulta</p>
          </div>
          <FileText className="w-8 h-8 text-brand-500 opacity-80" />
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Consultas e Leituras</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalViews}</p>
            <p className="text-xs text-gray-500 mt-0.5">Impacto no atendimento</p>
          </div>
          <Eye className="w-8 h-8 text-purple-500 opacity-80" />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Search & Category filter */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por termo, regras, bolsas, DP, portarias..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white" 
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer",
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white shadow-sm' 
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Documento / Título</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Status RAG</th>
                <th className="px-4 py-3">Trechos (Chunks)</th>
                <th className="px-4 py-3">Visualizações</th>
                <th className="px-4 py-3">Atualização</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {documents.map(doc => (
                <tr 
                  key={doc.id} 
                  onClick={() => setViewDocModal(doc)}
                  className="hover:bg-gray-50/80 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-slate-100 max-w-sm truncate">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-brand-600 shrink-0" />
                      <span className="truncate">{doc.title}</span>
                    </div>
                    {doc.filename && (
                      <p className="text-[11px] text-gray-400 font-mono pl-6 truncate">{doc.filename}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "px-2 py-0.5 text-[11px] font-semibold rounded uppercase tracking-wider",
                      doc.source === 'upload' 
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                    )}>
                      {doc.source === 'upload' ? 'Arquivo PDF' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="capitalize text-xs text-gray-600 dark:text-slate-300">{doc.category}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1 w-max">
                      <CheckCircle2 size={12} /> RAG Ativo
                    </span>
                    {(doc.r2Key || doc.source === 'upload') && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-1 w-max">
                        <Cloud size={10} /> Cloudflare R2
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-slate-400 font-mono">
                    {doc.chunkCount || 1} trechos
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-slate-400">
                    <div className="flex items-center gap-1"><Eye size={12} /> {doc.views}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-slate-400">
                    {formatRelative(doc.updatedAt || doc.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(doc.r2Key || doc.source === 'upload') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const token = localStorage.getItem('asaia_auth_token') || '';
                            const url = api.kb.getDownloadUrl(doc.id);
                            window.open(`${url}?token=${encodeURIComponent(token)}`, '_blank');
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                          title="Baixar Arquivo Original do Cloudflare R2"
                        >
                          <Download size={15} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Excluir da Base"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-slate-400">
                    Nenhum documento encontrado na base de conhecimento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Upload de Arquivo / PDF ── */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                    <FileUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Upload de Documento Institucional</h3>
                    <p className="text-xs text-gray-500">A IA extrairá os dados e criará chunks para o RAG</p>
                  </div>
                </div>
                <button onClick={() => setUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {uploadSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} /> {uploadSuccessMsg}
                </div>
              )}

              {uploadErrorMsg && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle size={16} /> {uploadErrorMsg}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Drag & Drop zone */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-brand-500 rounded-xl p-6 text-center cursor-pointer bg-gray-50/50 dark:bg-slate-900/50 transition-colors"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setUploadFile(e.target.files[0]);
                        if (!docTitle) setDocTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    accept=".pdf,.txt,.md"
                    className="hidden" 
                  />
                  <Upload className="w-10 h-10 mx-auto text-brand-600 mb-2 opacity-80" />
                  {uploadFile ? (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-gray-900 dark:text-white">{uploadFile.name}</p>
                      <p className="text-gray-400">{(uploadFile.size / 1024).toFixed(1)} KB • Pronto para processar</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        Clique para selecionar ou arraste o arquivo aqui
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Suporta PDF, TXT ou Markdown (até 25MB)</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">Título do Documento</label>
                  <input 
                    type="text"
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    placeholder="Ex: Manual do Aluno 2026 - Normas Acadêmicas"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">Categoria Institucional</label>
                  <select
                    value={docCategory}
                    onChange={e => setDocCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="Acadêmico">Acadêmico</option>
                    <option value="Matrícula">Matrícula</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Bolsas & Financiamento">Bolsas & Financiamento (FIES/Prouni)</option>
                    <option value="Secretaria">Secretaria Geral</option>
                    <option value="Geral">Regulamento Geral</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !uploadFile}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Processando RAG...' : 'Indexar no Álvaro AI'} <Sparkles size={14} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Novo Artigo Manual ── */}
      <AnimatePresence>
        {manualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-brand-600" size={20} />
                  <h3 className="font-bold text-gray-900 dark:text-white">Criar Artigo de FAQ</h3>
                </div>
                <button onClick={() => setManualModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {uploadErrorMsg && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                  {uploadErrorMsg}
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Título</label>
                  <input 
                    type="text"
                    required
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    placeholder="Ex: Como solicitar dispensa de disciplina (DP)?"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Categoria</label>
                    <select
                      value={docCategory}
                      onChange={e => setDocCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white"
                    >
                      <option value="Acadêmico">Acadêmico</option>
                      <option value="Matrícula">Matrícula</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Bolsas & Financiamento">Bolsas & Financiamento</option>
                      <option value="Secretaria">Secretaria</option>
                      <option value="Geral">Geral</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Tags (separadas por vírgula)</label>
                    <input 
                      type="text"
                      value={docTags}
                      onChange={e => setDocTags(e.target.value)}
                      placeholder="dp, dispensa, nota, semestre"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Conteúdo Completo</label>
                  <textarea
                    required
                    rows={6}
                    value={docContent}
                    onChange={e => setDocContent(e.target.value)}
                    placeholder="Descreva as orientações, passos, prazos e regras oficiais..."
                    className="w-full p-3 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setManualModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar e Indexar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Visualizar Documento / Leitor ── */}
      <AnimatePresence>
        {viewDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700 space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-start justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {viewDocModal.category}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{viewDocModal.title}</h3>
                  <p className="text-xs text-gray-400">Origem: {viewDocModal.filename || 'Redação Manual'} • {viewDocModal.chunkCount || 1} trechos indexados</p>
                </div>
                <button onClick={() => setViewDocModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                {viewDocModal.content}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Criado por {viewDocModal.author || 'Equipe ASA'}</span>
                  {(viewDocModal.r2Key || viewDocModal.source === 'upload') && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
                      <Cloud size={11} /> Cloudflare R2
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(viewDocModal.r2Key || viewDocModal.source === 'upload') && (
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('asaia_auth_token') || '';
                        const url = api.kb.getDownloadUrl(viewDocModal.id);
                        window.open(`${url}?token=${encodeURIComponent(token)}`, '_blank');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={13} /> Baixar Original (R2)
                    </button>
                  )}
                  <button
                    onClick={() => setViewDocModal(null)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
