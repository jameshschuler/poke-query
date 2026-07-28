import { useEffect, useRef } from 'react'
import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getMutationErrorMessage } from '#/lib/mutation-toast'

type UseUndoableQueryDeleteOptions<TItem, TKey extends string> = {
  queryClient: QueryClient
  queryKey: QueryKey
  itemsKey: TKey
  deleteRemote: (id: string) => Promise<void>
  getId: (item: TItem) => string
  getSortValue: (item: TItem) => number
  invalidateQueryKeys?: QueryKey[]
  deletedToastMessage: string
  rollbackErrorMessage: string
  undoLabel?: string
  commitDelayMs?: number
}

type CacheShape<TItem, TKey extends string> = {
  [K in TKey]: TItem[]
}

export function useUndoableQueryDelete<TItem, TKey extends string>(
  options: UseUndoableQueryDeleteOptions<TItem, TKey>,
) {
  const pendingDeleteTimeoutsRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    return () => {
      for (const timeoutId of pendingDeleteTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      pendingDeleteTimeoutsRef.current.clear()
    }
  }, [])

  function setItems(updater: (items: TItem[]) => TItem[]) {
    options.queryClient.setQueryData<CacheShape<TItem, TKey>>(
      options.queryKey,
      (current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          [options.itemsKey]: updater(current[options.itemsKey]),
        }
      },
    )
  }

  function restoreItem(deletedItem: TItem) {
    setItems((items) => {
      const id = options.getId(deletedItem)

      if (items.some((item) => options.getId(item) === id)) {
        return items
      }

      return [...items, deletedItem].sort(
        (a, b) => options.getSortValue(b) - options.getSortValue(a),
      )
    })
  }

  function scheduleDelete(item: TItem) {
    const deletedItem = item
    const id = options.getId(deletedItem)
    const delayMs = options.commitDelayMs ?? 5000

    setItems((items) => items.filter((entry) => options.getId(entry) !== id))

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteTimeoutsRef.current.delete(id)

      try {
        await options.deleteRemote(id)

        const invalidateKeys = options.invalidateQueryKeys ?? [options.queryKey]
        await Promise.all(
          invalidateKeys.map((queryKey) =>
            options.queryClient.invalidateQueries({ queryKey }),
          ),
        )
      } catch (rollbackError) {
        restoreItem(deletedItem)

        toast.error(
          getMutationErrorMessage(rollbackError, options.rollbackErrorMessage),
        )
      }
    }, delayMs)

    pendingDeleteTimeoutsRef.current.set(id, timeoutId)

    toast.success(options.deletedToastMessage, {
      action: {
        label: options.undoLabel ?? 'Undo',
        onClick: () => {
          const pendingTimeoutId = pendingDeleteTimeoutsRef.current.get(id)

          if (pendingTimeoutId) {
            window.clearTimeout(pendingTimeoutId)
            pendingDeleteTimeoutsRef.current.delete(id)
          }

          restoreItem(deletedItem)
        },
      },
    })
  }

  return {
    scheduleDelete,
  }
}
