/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: clipboard.ts
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 *
 * Cópia resiliente: navigator.clipboard exige contexto seguro (https/localhost).
 * No APK/WebView ou http dev o execCommand('copy') cobre o fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const value = String(text || '');
  if (!value) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* cai no fallback */
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
