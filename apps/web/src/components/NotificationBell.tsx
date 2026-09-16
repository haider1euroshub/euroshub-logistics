import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.js';
import { formatDateTimePST } from '@eliteship/shared';

export const NotificationBell: React.FC = () => {
 const { user } = useAuth();
 const [isOpen, setIsOpen] = useState(false);
 const [unreadCount, setUnreadCount] = useState(0);
 const [notifications, setNotifications] = useState<any[]>([]);
 const dropdownRef = useRef<HTMLDivElement>(null);

 const fetchNotifications = async () => {
 if (!user) return;
 try {
 const data = await apiClient<{ notifications: any[]; unreadCount: number }>('/api/notifications');
 setNotifications(data.notifications || []);
 setUnreadCount(data.unreadCount || 0);
 } catch (err) {
 // Non-critical
 }
 };

 useEffect(() => {
 if (user) {
 fetchNotifications();
 const interval = setInterval(fetchNotifications, 15000); // 15s poll
 return () => clearInterval(interval);
 }
 }, [user]);

 // Click outside listener
 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
 setIsOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const markAsRead = async (id: string) => {
 try {
 await apiClient(`/api/notifications/${id}/read`, { method: 'POST' });
 setNotifications((prev) =>
 prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
 );
 setUnreadCount((c) => Math.max(0, c - 1));
 } catch (err) {
 // Ignore
 }
 };

 const markAllAsRead = async () => {
 try {
 await apiClient('/api/notifications/read-all', { method: 'POST' });
 setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
 setUnreadCount(0);
 } catch (err) {
 // Ignore
 }
 };

 if (!user) return null;

 return (
 <div className="relative" ref={dropdownRef}>
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
 aria-label="Notifications"
 >
 <Bell className="w-5 h-5" />
 {unreadCount > 0 && (
 <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm">
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 )}
 </button>

 {isOpen && (
 <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
 <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70 ">
 <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
 Notifications
 {unreadCount > 0 && (
 <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-semibold">
 {unreadCount} new
 </span>
 )}
 </h4>
 {unreadCount > 0 && (
 <button
 onClick={markAllAsRead}
 className="text-xs text-brand-600 hover:underline font-medium flex items-center gap-1"
 >
 <Check className="w-3.5 h-3.5" /> Mark all read
 </button>
 )}
 </div>

 <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 ">
 {notifications.length === 0 ? (
 <div className="p-8 text-center text-xs text-slate-400">
 No notifications right now.
 </div>
 ) : (
 notifications.map((n) => (
 <div
 key={n.id}
 onClick={() => !n.isRead && markAsRead(n.id)}
 className={`p-3.5 text-xs transition-colors cursor-pointer ${
 !n.isRead
 ? 'bg-brand-50/40 '
 : 'hover:bg-slate-50 '
 }`}
 >
 <div className="flex items-start justify-between gap-2">
 <p className={`font-semibold ${!n.isRead ? 'text-slate-900 ' : 'text-slate-700 '}`}>
 {n.title}
 </p>
 <span className="text-[10px] text-slate-400 shrink-0">
 {formatDateTimePST(n.createdAt)}
 </span>
 </div>
 <p className="text-slate-600 mt-1 leading-relaxed">
 {n.body}
 </p>
 {n.relatedShipmentId && (
 <a
 href={`/shipments/${n.relatedShipmentId}`}
 className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline mt-1.5 font-medium"
 >
 View shipment details <ExternalLink className="w-3 h-3" />
 </a>
 )}
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>
 );
};
