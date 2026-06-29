import { isElementInViewport } from "../element/sizeHelpers";
import { isImageElement } from "../element/typeChecks";
import type {
  ExcalidrawElement,
  NonDeletedElementsMap,
  NonDeletedExcalidrawElement,
} from "../element/types";
import { renderInteractiveSceneThrottled } from "../renderer/interactiveScene";
import { renderStaticSceneThrottled } from "../renderer/staticScene";

import type { AppState } from "../types";
import { memoize, toBrandedType } from "../utils";
import type Scene from "./Scene";
import type { RenderableElementsMap } from "./types";

// CHUNK_RENDERING — Added per D-18 (Phase 1, Plan 05)
// Partitions canvas into 2000x2000px chunks to reduce element traversal
// before the precise isElementInViewport() check.
const CHUNK_SIZE = 2000;

interface ChunkBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

function getVisibleChunkBounds(
  scrollX: number,
  scrollY: number,
  viewportWidth: number,
  viewportHeight: number,
  bufferChunks: number = 1,
): ChunkBounds {
  return {
    minCol: Math.floor(scrollX / CHUNK_SIZE) - bufferChunks,
    maxCol: Math.ceil((scrollX + viewportWidth) / CHUNK_SIZE) + bufferChunks,
    minRow: Math.floor(scrollY / CHUNK_SIZE) - bufferChunks,
    maxRow: Math.ceil((scrollY + viewportHeight) / CHUNK_SIZE) + bufferChunks,
  };
}

function isInVisibleChunks(
  elementX: number,
  elementY: number,
  elementWidth: number,
  elementHeight: number,
  bounds: ChunkBounds,
): boolean {
  const elMinCol = Math.floor(elementX / CHUNK_SIZE);
  const elMaxCol = Math.floor((elementX + elementWidth) / CHUNK_SIZE);
  const elMinRow = Math.floor(elementY / CHUNK_SIZE);
  const elMaxRow = Math.floor((elementY + elementHeight) / CHUNK_SIZE);
  return (
    elMaxCol >= bounds.minCol &&
    elMinCol <= bounds.maxCol &&
    elMaxRow >= bounds.minRow &&
    elMinRow <= bounds.maxRow
  );
}

export class Renderer {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public getRenderableElements = (() => {
    const getVisibleCanvasElements = ({
      elementsMap,
      zoom,
      offsetLeft,
      offsetTop,
      scrollX,
      scrollY,
      height,
      width,
    }: {
      elementsMap: NonDeletedElementsMap;
      zoom: AppState["zoom"];
      offsetLeft: AppState["offsetLeft"];
      offsetTop: AppState["offsetTop"];
      scrollX: AppState["scrollX"];
      scrollY: AppState["scrollY"];
      height: AppState["height"];
      width: AppState["width"];
    }): readonly NonDeletedExcalidrawElement[] => {
      // CHUNK_RENDERING — Coarse pre-filter before precise isElementInViewport()
      // Only elements in visible chunks (+1 buffer) proceed to the precise check.
      // This reduces element traversal from O(n) to O(chunks) for sparse canvases.
      const chunkBounds = getVisibleChunkBounds(
        scrollX,
        scrollY,
        width,
        height,
        1, // bufferChunks — 1 chunk buffer in each direction
      );

      const visibleElements: NonDeletedExcalidrawElement[] = [];
      for (const element of elementsMap.values()) {
        if (
          isInVisibleChunks(
            element.x,
            element.y,
            element.width,
            element.height,
            chunkBounds,
          ) &&
          isElementInViewport(
            element,
            width,
            height,
            {
              zoom,
              offsetLeft,
              offsetTop,
              scrollX,
              scrollY,
            },
            elementsMap,
          )
        ) {
          visibleElements.push(element);
        }
      }
      return visibleElements;
    };

    const getRenderableElements = ({
      elements,
      editingTextElement,
      newElementId,
      pendingImageElementId,
    }: {
      elements: readonly NonDeletedExcalidrawElement[];
      editingTextElement: AppState["editingTextElement"];
      newElementId: ExcalidrawElement["id"] | undefined;
      pendingImageElementId: AppState["pendingImageElementId"];
    }) => {
      const elementsMap = toBrandedType<RenderableElementsMap>(new Map());

      for (const element of elements) {
        if (isImageElement(element)) {
          if (
            // => not placed on canvas yet (but in elements array)
            pendingImageElementId === element.id
          ) {
            continue;
          }
        }

        if (newElementId === element.id) {
          continue;
        }

        // we don't want to render text element that's being currently edited
        // (it's rendered on remote only)
        if (
          !editingTextElement ||
          editingTextElement.type !== "text" ||
          element.id !== editingTextElement.id
        ) {
          elementsMap.set(element.id, element);
        }
      }
      return elementsMap;
    };

    return memoize(
      ({
        zoom,
        offsetLeft,
        offsetTop,
        scrollX,
        scrollY,
        height,
        width,
        editingTextElement,
        newElementId,
        pendingImageElementId,
        // cache-invalidation nonce
        sceneNonce: _sceneNonce,
      }: {
        zoom: AppState["zoom"];
        offsetLeft: AppState["offsetLeft"];
        offsetTop: AppState["offsetTop"];
        scrollX: AppState["scrollX"];
        scrollY: AppState["scrollY"];
        height: AppState["height"];
        width: AppState["width"];
        editingTextElement: AppState["editingTextElement"];
        /** note: first render of newElement will always bust the cache
         * (we'd have to prefilter elements outside of this function) */
        newElementId: ExcalidrawElement["id"] | undefined;
        pendingImageElementId: AppState["pendingImageElementId"];
        sceneNonce: ReturnType<InstanceType<typeof Scene>["getSceneNonce"]>;
      }) => {
        const elements = this.scene.getNonDeletedElements();

        const elementsMap = getRenderableElements({
          elements,
          editingTextElement,
          newElementId,
          pendingImageElementId,
        });

        const visibleElements = getVisibleCanvasElements({
          elementsMap,
          zoom,
          offsetLeft,
          offsetTop,
          scrollX,
          scrollY,
          height,
          width,
        });

        return { elementsMap, visibleElements };
      },
    );
  })();

  // NOTE Doesn't destroy everything (scene, rc, etc.) because it may not be
  // safe to break TS contract here (for upstream cases)
  public destroy() {
    renderInteractiveSceneThrottled.cancel();
    renderStaticSceneThrottled.cancel();
    this.getRenderableElements.clear();
  }
}
