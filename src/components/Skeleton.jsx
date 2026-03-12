import React from 'react';

const Skeleton = ({ className = '', variant = 'rect' }) => {
    const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700/50';
    const variantClasses = {
        rect: 'rounded-2xl',
        circle: 'rounded-full',
        text: 'rounded-md h-4 w-full',
    };

    return <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />;
};

export const DashboardSkeleton = () => (
    <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-9 w-32" />
            <div className="flex gap-2">
                <Skeleton className="h-10 w-10 circle" />
                <Skeleton className="h-10 w-10 circle" />
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[100px]" />)}
        </div>
        <div className="flex gap-3 mb-6">
            <Skeleton className="h-14 flex-1" />
            <Skeleton className="h-14 flex-1" />
        </div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
    </div>
);

export const CustomersSkeleton = () => (
    <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-10 w-10 circle" />
        </div>
        <Skeleton className="h-12 w-full mb-4" />
        <div className="flex gap-2 mb-4 overflow-x-hidden">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-12 w-12 circle" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="text-right space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const CustomerDetailSkeleton = () => (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen px-4 py-6">
        <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-10 w-10 circle" />
            <div className="space-y-2 flex flex-col items-center">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-10 circle" />
        </div>
        <Skeleton className="h-32 w-full mb-6" />
        <div className="flex gap-3 mb-6">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
        </div>
        <div className="flex gap-3 mb-8">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
        </div>
        <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
    </div>
);

export const LoginSkeleton = () => (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
            <Skeleton className="w-24 h-24 rounded-[32px] mx-auto mb-4" />
            <Skeleton className="h-8 w-40 mx-auto mb-2" />
            <Skeleton className="h-4 w-56 mx-auto mb-10" />

            <div className="bg-white dark:bg-gray-800 rounded-[20px] p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-6">
                <Skeleton className="h-6 w-20 mx-auto mb-6" />
                <div className="space-y-4">
                    <div>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                    <div>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
                <Skeleton className="h-14 w-full" />
                <div className="space-y-3 pt-2">
                    <Skeleton className="h-4 w-32 mx-auto" />
                    <Skeleton className="h-4 w-48 mx-auto" />
                </div>
            </div>
        </div>
    </div>
);

export const AppLoadingSkeleton = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div className="w-full h-full max-w-md px-6 space-y-8 animate-pulse">
            {/* Header Area */}
            <div className="flex justify-between items-center w-full">
                <Skeleton className="h-8 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 circle" />
                    <Skeleton className="h-10 w-10 circle" />
                </div>
            </div>

            {/* Main Stats Block */}
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
            </div>

            {/* Button Actions */}
            <div className="flex gap-4">
                <Skeleton className="h-14 flex-1" />
                <Skeleton className="h-14 flex-1" />
            </div>

            {/* List Header */}
            <Skeleton className="h-6 w-40" />

            {/* List Items */}
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                        <Skeleton className="h-12 w-12 circle" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2 opacity-50" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const ProfileSkeleton = () => (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-24">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-b-[40px] shadow-sm mb-6">
            <div className="flex flex-col items-center pt-8">
                <Skeleton className="h-24 w-24 circle mb-4" />
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-4 mt-8">
                <Skeleton className="h-16 flex-1 rounded-2xl" />
                <Skeleton className="h-16 flex-1 rounded-2xl" />
            </div>
        </div>
        <div className="px-4 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
    </div>
);

export const SubscriptionSkeleton = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 px-4 pt-10">
        <Skeleton className="h-10 w-10 circle mb-6" />
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-full mb-8" />
        <div className="card h-64 mb-6">
            <Skeleton className="h-full w-full" />
        </div>
        <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
    </div>
);

export default Skeleton;
