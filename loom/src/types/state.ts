export type StateItemType = 'note' | 'task' | 'link' | 'snippet' | 'calendar_event';

export interface StateItem {
  id: string;
  type: StateItemType;
  title: string;
  content: string;
  tags: string[];
  links?: string[]; // IDs of related state items for cross-linking
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export type StateFilter = {
  type?: StateItemType | 'all';
  tag?: string;
  search?: string;
};

