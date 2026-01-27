import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';

export const LoginPromptModal: React.FC = () => {
  const { loginPromptOpen, closeLoginPrompt, signIn } = useAuth();

  if (!loginPromptOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-gray-900 dark:text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">로그인이 필요합니다</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              이 기능은 로그인 후 이용할 수 있습니다. Google 로그인 후 계속 진행해주세요.
            </p>
          </div>
          <button
            onClick={closeLoginPrompt}
            className="rounded-lg p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/10"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={async () => {
              await signIn();
            }}
            className="flex-1 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-900 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Google 로그인
          </button>
          <button
            onClick={closeLoginPrompt}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-white/5"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
};
