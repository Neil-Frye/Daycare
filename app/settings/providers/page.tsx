'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, AlertTriangle } from 'lucide-react';
import logger from '@/lib/logger'; // Assuming a client-side logger is available or can be added

// Define the structure of a provider object based on backend
interface UserDaycareProvider {
    id: string;
    user_id: string;
    provider_name: string;
    report_sender_email: string;
    parser_strategy?: string | null;
    created_at: string;
    updated_at: string;
}

const ProvidersPage = () => {
    const [providers, setProviders] = useState<UserDaycareProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [currentProvider, setCurrentProvider] = useState<UserDaycareProvider | null>(null);
    const [providerToDelete, setProviderToDelete] = useState<UserDaycareProvider | null>(null);

    const [formData, setFormData] = useState<{ provider_name: string; report_sender_email: string; parser_strategy?: string }>({
        provider_name: '',
        report_sender_email: '',
        parser_strategy: '',
    });
    const [formError, setFormError] = useState<string | null>(null);

    const fetchProviders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/user-daycare-providers');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to fetch providers: ${response.statusText}`);
            }
            const data: UserDaycareProvider[] = await response.json();
            setProviders(data);
        } catch (err: any) {
            logger.error({ component: 'ProvidersPage', method: 'fetchProviders', error: err.message });
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = (): boolean => {
        if (!formData.provider_name.trim()) {
            setFormError("Provider name is required.");
            return false;
        }
        if (!formData.report_sender_email.trim()) {
            setFormError("Sender email is required.");
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.report_sender_email)) {
            setFormError("Invalid email format for sender email.");
            return false;
        }
        setFormError(null);
        return true;
    };
    
    const resetForm = () => {
        setFormData({ provider_name: '', report_sender_email: '', parser_strategy: '' });
        setFormError(null);
        setCurrentProvider(null);
    };

    const handleAddProvider = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const handleEditProvider = (provider: UserDaycareProvider) => {
        setCurrentProvider(provider);
        setFormData({
            provider_name: provider.provider_name,
            report_sender_email: provider.report_sender_email,
            parser_strategy: provider.parser_strategy || '',
        });
        setFormError(null);
        setIsFormOpen(true);
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        const url = currentProvider ? `/api/user-daycare-providers/${currentProvider.id}` : '/api/user-daycare-providers';
        const method = currentProvider ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${currentProvider ? 'update' : 'create'} provider.`);
            }
            
            await fetchProviders(); // Refresh list
            setIsFormOpen(false);
            resetForm();
        } catch (err: any) {
            logger.error({ component: 'ProvidersPage', method: 'handleSubmitForm', error: err.message, isEditing: !!currentProvider });
            setFormError(err.message);
        }
    };
    
    const openDeleteConfirmDialog = (provider: UserDaycareProvider) => {
        setProviderToDelete(provider);
        setIsConfirmDeleteOpen(true);
    };

    const handleDeleteProvider = async () => {
        if (!providerToDelete) return;

        try {
            const response = await fetch(`/api/user-daycare-providers/${providerToDelete.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete provider.');
            }
            
            await fetchProviders(); // Refresh list
            setIsConfirmDeleteOpen(false);
            setProviderToDelete(null);
        } catch (err: any) {
            logger.error({ component: 'ProvidersPage', method: 'handleDeleteProvider', error: err.message, providerId: providerToDelete.id });
            // Display error to user, perhaps in the dialog or as a toast
            setError(`Failed to delete ${providerToDelete.provider_name}: ${err.message}`);
            // Keep dialog open to show error or close and show toast
        }
    };


    if (isLoading) return <div className="p-4">Loading provider configurations...</div>;
    // Main error display for fetch errors
    if (error && !isConfirmDeleteOpen) return <div className="p-4 text-red-600">Error: {error}</div>;


    return (
        <div className="container mx-auto p-4 md:p-6">
            <header className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Manage Daycare Providers</h1>
                <Button onClick={handleAddProvider}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Provider
                </Button>
            </header>

            {providers.length === 0 && !isLoading && (
                <div className="text-center text-gray-500 py-8">
                    <p>No daycare providers configured yet.</p>
                    <p>Click &quot;Add New Provider&quot; to get started.</p>
                </div>
            )}

            {providers.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Provider Name</TableHead>
                                <TableHead>Sender Email</TableHead>
                                <TableHead className="hidden md:table-cell">Parser Strategy</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {providers.map((provider) => (
                                <TableRow key={provider.id}>
                                    <TableCell className="font-medium">{provider.provider_name}</TableCell>
                                    <TableCell>{provider.report_sender_email}</TableCell>
                                    <TableCell className="hidden md:table-cell">{provider.parser_strategy || 'Default'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditProvider(provider)} className="mr-2">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openDeleteConfirmDialog(provider)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                setIsFormOpen(isOpen);
                if (!isOpen) resetForm();
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{currentProvider ? 'Edit Provider' : 'Add New Provider'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitForm}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label htmlFor="provider_name" className="text-right col-span-1">Name</label>
                                <Input id="provider_name" name="provider_name" value={formData.provider_name} onChange={handleInputChange} className="col-span-3" placeholder="e.g., Bright Horizons Downtown"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label htmlFor="report_sender_email" className="text-right col-span-1">Sender Email</label>
                                <Input id="report_sender_email" name="report_sender_email" type="email" value={formData.report_sender_email} onChange={handleInputChange} className="col-span-3" placeholder="e.g., notifications@tadpoles.com"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label htmlFor="parser_strategy" className="text-right col-span-1">Parser (Optional)</label>
                                <Input id="parser_strategy" name="parser_strategy" value={formData.parser_strategy || ''} onChange={handleInputChange} className="col-span-3" placeholder="e.g., tadpoles_v1 (leave blank if unsure)"/>
                            </div>
                            {formError && <p className="col-span-4 text-sm text-red-600 text-center">{formError}</p>}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">{currentProvider ? 'Save Changes' : 'Create Provider'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                           <AlertTriangle className="mr-2 h-5 w-5 text-red-500" /> Confirm Deletion
                        </DialogTitle>
                         <DialogDescription>
                            Are you sure you want to delete the provider &quot;{providerToDelete?.provider_name}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                     {/* Display error message related to delete operation specifically */}
                    {error && isConfirmDeleteOpen && <p className="text-sm text-red-600 py-2">{error}</p>}
                    <DialogFooter className="sm:justify-end">
                         <DialogClose asChild>
                            <Button type="button" variant="outline" onClick={() => { setIsConfirmDeleteOpen(false); setError(null); }}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteProvider}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProvidersPage;
