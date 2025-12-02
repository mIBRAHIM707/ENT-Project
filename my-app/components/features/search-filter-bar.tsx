"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronDown,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { TASK_CATEGORIES } from "./smart-pricing-form";

// Export these for use in other components
export const URGENCY_OPTIONS = ["Flexible", "This week", "3 days", "Today", "ASAP"];
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "urgency", label: "Most Urgent" },
];

export const LOCATION_OPTIONS = [
  "Hostel 1", "Hostel 2", "Hostel 3", "Hostel 4", "Hostel 5",
  "Hostel 6", "Hostel 7", "Hostel 8", "Hostel 9", "Hostel 10",
  "Hostel 11", "Hostel 12", "New Girls Hostel", "Library",
  "Academic Block", "Cafe", "Admin Block", "Sports Complex",
  "Auditorium", "Other",
];

export interface FilterState {
  search: string;
  category: string;
  urgency: string;
  location: string;
  minPrice: number;
  maxPrice: number;
  sortBy: string;
}

interface SearchFilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activeFilterCount: number;
}

export function SearchFilterBar({ 
  filters, 
  onFiltersChange,
  activeFilterCount 
}: SearchFilterBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [localPriceRange, setLocalPriceRange] = useState([filters.minPrice, filters.maxPrice]);

  const updateFilter = (key: keyof FilterState, value: string | number) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      category: "",
      urgency: "",
      location: "",
      minPrice: 0,
      maxPrice: 10000,
      sortBy: "newest",
    });
    setLocalPriceRange([0, 10000]);
  };

  const applyPriceRange = () => {
    onFiltersChange({
      ...filters,
      minPrice: localPriceRange[0],
      maxPrice: localPriceRange[1],
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <Select value={filters.sortBy} onValueChange={(v) => updateFilter("sortBy", v)}>
          <SelectTrigger className="w-[180px] h-12 rounded-xl bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
            <ArrowUpDown className="h-4 w-4 mr-2 text-zinc-400" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="rounded-lg">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filters Button */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="h-12 px-4 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 relative"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-emerald-500 text-white text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-6">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl font-bold">Filters</SheetTitle>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-red-500 hover:text-red-600">
                    Clear all
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="space-y-6">
              {/* Category Filter */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 block">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={filters.category === "" ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                      filters.category === "" 
                        ? "bg-emerald-500 text-white" 
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                    onClick={() => updateFilter("category", "")}
                  >
                    All
                  </Badge>
                  {TASK_CATEGORIES.map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={filters.category === cat.value ? "default" : "outline"}
                      className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                        filters.category === cat.value 
                          ? "bg-emerald-500 text-white" 
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      onClick={() => updateFilter("category", cat.value)}
                    >
                      {cat.emoji} {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Urgency Filter */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 block">
                  Urgency
                </label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={filters.urgency === "" ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                      filters.urgency === "" 
                        ? "bg-emerald-500 text-white" 
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                    onClick={() => updateFilter("urgency", "")}
                  >
                    All
                  </Badge>
                  {URGENCY_OPTIONS.map((urg) => (
                    <Badge
                      key={urg}
                      variant={filters.urgency === urg ? "default" : "outline"}
                      className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                        filters.urgency === urg 
                          ? "bg-emerald-500 text-white" 
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      onClick={() => updateFilter("urgency", urg)}
                    >
                      {urg}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 block">
                  Location
                </label>
                <Select value={filters.location} onValueChange={(v) => updateFilter("location", v)}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    <SelectItem value="" className="rounded-lg">All Locations</SelectItem>
                    {LOCATION_OPTIONS.map((loc) => (
                      <SelectItem key={loc} value={loc} className="rounded-lg">
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 block">
                  Price Range
                </label>
                <div className="px-2 mb-4">
                  <Slider
                    value={localPriceRange}
                    onValueChange={setLocalPriceRange}
                    onValueCommit={applyPriceRange}
                    min={0}
                    max={10000}
                    step={100}
                    className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <span>Rs. {localPriceRange[0].toLocaleString()}</span>
                  <span>Rs. {localPriceRange[1].toLocaleString()}</span>
                </div>
              </div>

              {/* Apply Button */}
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {filters.category && (
              <Badge 
                variant="secondary" 
                className="pl-3 pr-2 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              >
                {TASK_CATEGORIES.find(c => c.value === filters.category)?.label}
                <button onClick={() => updateFilter("category", "")} className="ml-2 hover:text-emerald-900">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.urgency && (
              <Badge 
                variant="secondary" 
                className="pl-3 pr-2 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
              >
                {filters.urgency}
                <button onClick={() => updateFilter("urgency", "")} className="ml-2 hover:text-amber-900">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.location && (
              <Badge 
                variant="secondary" 
                className="pl-3 pr-2 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
              >
                {filters.location}
                <button onClick={() => updateFilter("location", "")} className="ml-2 hover:text-blue-900">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.minPrice > 0 || filters.maxPrice < 10000) && (
              <Badge 
                variant="secondary" 
                className="pl-3 pr-2 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
              >
                Rs. {filters.minPrice.toLocaleString()} - Rs. {filters.maxPrice.toLocaleString()}
                <button onClick={() => {
                  onFiltersChange({ ...filters, minPrice: 0, maxPrice: 10000 });
                  setLocalPriceRange([0, 10000]);
                }} className="ml-2 hover:text-purple-900">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to count active filters
export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.category) count++;
  if (filters.urgency) count++;
  if (filters.location) count++;
  if (filters.minPrice > 0 || filters.maxPrice < 10000) count++;
  return count;
}

// Helper to filter jobs client-side
export function filterJobs<T extends {
  title: string;
  description?: string;
  category?: string;
  urgency: string;
  location: string;
  price: number;
  createdAt?: string | null;
}>(jobs: T[], filters: FilterState): T[] {
  let filtered = [...jobs];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (job) =>
        job.title.toLowerCase().includes(searchLower) ||
        (job.description && job.description.toLowerCase().includes(searchLower))
    );
  }

  // Category filter
  if (filters.category) {
    filtered = filtered.filter((job) => job.category === filters.category);
  }

  // Urgency filter
  if (filters.urgency) {
    filtered = filtered.filter((job) => job.urgency === filters.urgency);
  }

  // Location filter
  if (filters.location) {
    filtered = filtered.filter((job) => job.location === filters.location);
  }

  // Price range filter
  filtered = filtered.filter(
    (job) => job.price >= filters.minPrice && job.price <= filters.maxPrice
  );

  // Sort
  const urgencyOrder = ["ASAP", "Today", "3 days", "This week", "Flexible"];
  
  filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case "oldest":
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case "price_low":
        return a.price - b.price;
      case "price_high":
        return b.price - a.price;
      case "urgency":
        return urgencyOrder.indexOf(a.urgency) - urgencyOrder.indexOf(b.urgency);
      case "newest":
      default:
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });

  return filtered;
}
