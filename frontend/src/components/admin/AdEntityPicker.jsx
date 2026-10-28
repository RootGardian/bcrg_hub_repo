import React, { useState } from 'react';
import {
  FolderTree,
  Folder,
  FolderOpen,
  Server,
  Box,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  CheckCircle2,
  Users,
  UserCheck
} from 'lucide-react';

export const parseDnHierarchy = (dn, isContainerOnly = false) => {
  if (!dn) return [];
  const parts = dn.split(/(?<!\\),/).map((p) => p.trim());
  if (parts.length === 0) return [];

  const firstDcIndex = parts.findIndex((p) => p.toUpperCase().startsWith('DC='));
  const maxContainerIndex = firstDcIndex !== -1 ? firstDcIndex : parts.length;
  const startIndex = isContainerOnly ? 0 : 1;

  if (startIndex >= maxContainerIndex) return [];

  const segments = [];
  for (let i = maxContainerIndex - 1; i >= startIndex; i--) {
    const part = parts[i];
    const isOu = part.toUpperCase().startsWith('OU=');
    const isCn = part.toUpperCase().startsWith('CN=');
    if (isOu || isCn) {
      const type = isOu ? 'OU' : 'CONTAINER';
      const name = part.substring(3);
      const fullDn = parts.slice(i).join(',');
      segments.push({
        raw: part,
        name,
        type,
        dn: fullDn
      });
    }
  }
  return segments;
};

export const getOuPath = (dn) => {
  if (!dn) return 'Racine du domaine';
  const segments = parseDnHierarchy(dn, false);
  if (segments.length === 0) return 'Racine du domaine';
  return segments.map((s) => s.name).join(' › ');
};

export const buildEntityTree = (items = [], ous = []) => {
  let domainName = 'BCRG.LOCAL';
  const sampleDn = items[0]?.dn || ous[0]?.dn || '';
  const dcMatches = sampleDn.match(/DC=([^,]+)/gi);
  if (dcMatches && dcMatches.length > 0) {
    domainName = dcMatches.map((m) => m.replace(/DC=/i, '')).join('.').toUpperCase();
  }

  const rootNode = {
    id: 'ROOT',
    name: domainName,
    type: 'DOMAIN',
    dn: null,
    children: {},
    items: []
  };

  // 1. OUs connues
  ous.forEach((ou) => {
    if (!ou.dn) return;
    const hierarchy = parseDnHierarchy(ou.dn, true);
    let current = rootNode;
    hierarchy.forEach((seg) => {
      if (!current.children[seg.name]) {
        current.children[seg.name] = {
          id: seg.dn,
          name: seg.name,
          type: seg.type,
          dn: seg.dn,
          children: {},
          items: []
        };
      }
      current = current.children[seg.name];
    });
  });

  // 2. Éléments (groupes ou utilisateurs)
  items.forEach((item) => {
    if (!item.dn) {
      rootNode.items.push(item);
      return;
    }
    const hierarchy = parseDnHierarchy(item.dn, false);
    let current = rootNode;
    hierarchy.forEach((seg) => {
      if (!current.children[seg.name]) {
        current.children[seg.name] = {
          id: seg.dn,
          name: seg.name,
          type: seg.type,
          dn: seg.dn,
          children: {},
          items: []
        };
      }
      current = current.children[seg.name];
    });
    current.items.push(item);
  });

  return rootNode;
};

export const countItemsInNode = (node) => {
  let count = (node.items || []).length;
  Object.values(node.children || {}).forEach((child) => {
    count += countItemsInNode(child);
  });
  return count;
};

export const AdEntityPicker = ({
  items = [],
  ous = [],
  selectedId = '',
  selectedName = '',
  onSelect,
  onClear,
  entityType = 'GROUP'
}) => {
  const [pickerMode, setPickerMode] = useState('tree'); // 'tree' | 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set(['ROOT']));

  const tree = buildEntityTree(items, ous);
  const selectedItem = items.find((i) => i.identifier === selectedId);

  const toggleNode = (nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = (rootNode) => {
    const ids = new Set(['ROOT']);
    const collect = (n) => {
      ids.add(n.id);
      Object.values(n.children || {}).forEach(collect);
    };
    collect(rootNode);
    setExpandedNodes(ids);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['ROOT']));
  };

  const renderTreeNode = (node, level = 0) => {
    const childrenKeys = Object.keys(node.children || {});
    const hasChildren = childrenKeys.length > 0;
    const hasItems = (node.items || []).length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const totalCount = countItemsInNode(node);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const matchNode = node.name.toLowerCase().includes(q);
      const matchAnyItem = (node.items || []).some(
        (item) =>
          (item.name || '').toLowerCase().includes(q) ||
          (item.identifier || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
      );
      const matchChildren = (n) => {
        if (n.name.toLowerCase().includes(q)) return true;
        if (
          (n.items || []).some(
            (i) =>
              (i.name || '').toLowerCase().includes(q) ||
              (i.identifier || '').toLowerCase().includes(q)
          )
        )
          return true;
        return Object.values(n.children || {}).some(matchChildren);
      };

      if (!matchNode && !matchAnyItem && !matchChildren(node)) {
        return null;
      }
    }

    return (
      <div key={node.id || node.name} style={{ marginLeft: level > 0 ? '12px' : '0' }}>
        <div
          className="ad-tree-node-row"
          onClick={() => toggleNode(node.id)}
          title={node.dn || node.name}
        >
          {hasChildren || hasItems ? (
            <span
              className="ad-tree-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span style={{ width: 18, height: 18, display: 'inline-block' }} />
          )}

          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {node.type === 'DOMAIN' ? (
              <Server size={15} color="#0284c7" />
            ) : node.type === 'CONTAINER' ? (
              <Box size={15} color="#8b5cf6" />
            ) : isExpanded ? (
              <FolderOpen size={15} color="#f59e0b" />
            ) : (
              <Folder size={15} color="#f59e0b" />
            )}
          </span>

          <span
            style={{
              fontWeight: 600,
              color: '#1e293b',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {node.name}
          </span>

          {totalCount > 0 && <span className="ad-tree-badge-count">{totalCount}</span>}
        </div>

        {isExpanded && (
          <div style={{ borderLeft: '1px dashed #cbd5e1', marginLeft: '9px', paddingLeft: '8px' }}>
            {childrenKeys
              .sort((a, b) => a.localeCompare(b))
              .map((childKey) => renderTreeNode(node.children[childKey], level + 1))}

            {(node.items || [])
              .filter((item) => {
                if (!q) return true;
                return (
                  (item.name || '').toLowerCase().includes(q) ||
                  (item.identifier || '').toLowerCase().includes(q) ||
                  (item.description || '').toLowerCase().includes(q)
                );
              })
              .map((item) => {
                const isSelected = selectedId === item.identifier;
                return (
                  <div
                    key={item.identifier}
                    className={`ad-tree-item-row ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                    title={item.dn || item.name}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{ color: isSelected ? '#1d4ed8' : '#0284c7', display: 'flex' }}>
                        {entityType === 'GROUP' ? <Users size={14} /> : <UserCheck size={14} />}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.name || item.identifier}
                          {item.name && item.identifier !== item.name && (
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px', fontWeight: 'normal' }}>
                              ({item.identifier})
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#64748b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected ? (
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Check size={12} /> Choisi
                      </span>
                    ) : (
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          color: '#0284c7',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Sélectionner
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ad-tree-picker-container">
      <div className="ad-tree-tabs">
        <button
          type="button"
          className={`ad-tree-tab-btn ${pickerMode === 'tree' ? 'active' : ''}`}
          onClick={() => setPickerMode('tree')}
        >
          <FolderTree size={14} /> Arborescence AD (OUs & Sous-groupes)
        </button>
        <button
          type="button"
          className={`ad-tree-tab-btn ${pickerMode === 'search' ? 'active' : ''}`}
          onClick={() => setPickerMode('search')}
        >
          <Search size={14} /> Recherche directe
        </button>
      </div>

      {pickerMode === 'tree' && (
        <div>
          <div className="ad-tree-toolbar">
            <div className="ad-tree-search-box">
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder={`Filtrer l'arborescence (${entityType === 'GROUP' ? 'groupe, sous-dossier' : 'utilisateur'})...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#94a3b8' }}
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '3px 7px',
                  fontSize: '11px',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600
                }}
                onClick={() => expandAll(tree)}
                title="Tout déplier"
              >
                <FolderOpen size={13} /> Déplier
              </button>
              <button
                type="button"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '3px 7px',
                  fontSize: '11px',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600
                }}
                onClick={collapseAll}
                title="Tout replier"
              >
                <Folder size={13} /> Replier
              </button>
            </div>
          </div>

          <div className="ad-tree-scroll-area">
            {renderTreeNode(tree, 0)}
          </div>
        </div>
      )}

      {pickerMode === 'search' && (
        <div style={{ padding: '10px' }}>
          <input
            type="text"
            placeholder={`Tapez un nom pour filtrer les ${entityType === 'GROUP' ? 'groupes' : 'utilisateurs'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
              marginBottom: '8px'
            }}
          />
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '6px' }}>
            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = items.filter(
                (i) =>
                  !q ||
                  (i.name || '').toLowerCase().includes(q) ||
                  (i.identifier || '').toLowerCase().includes(q) ||
                  (i.description || '').toLowerCase().includes(q) ||
                  getOuPath(i.dn).toLowerCase().includes(q)
              );

              if (filtered.length === 0) {
                return (
                  <div style={{ padding: '16px', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>
                    Aucun élément correspondant trouvé.
                  </div>
                );
              }

              return filtered.map((item) => {
                const isSelected = selectedId === item.identifier;
                return (
                  <div
                    key={item.identifier}
                    className={`ad-tree-item-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelect(item)}
                    style={{ padding: '8px 10px', borderBottom: '1px solid #f8fafc' }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: isSelected ? '#1d4ed8' : '#0284c7' }}>
                          {entityType === 'GROUP' ? <Users size={14} /> : <UserCheck size={14} />}
                        </span>
                        <span style={{ fontWeight: 600 }}>{item.name || item.identifier}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({item.identifier})</span>
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#0369a1',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Folder size={11} /> Emplacement : {getOuPath(item.dn)}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700
                        }}
                      >
                        ✓ Choisi
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {selectedId && (
        <div className="ad-selected-card" style={{ margin: '8px 10px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#16a34a" />
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                {selectedName || selectedId}{' '}
                <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '11px' }}>
                  ({selectedId})
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                📁 Emplacement : {getOuPath(selectedItem?.dn)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '11.5px',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            Changer
          </button>
        </div>
      )}
    </div>
  );
};

export default AdEntityPicker;
