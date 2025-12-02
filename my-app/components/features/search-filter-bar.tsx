"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ArrowUpDown,
  Check,
  MapPin,
  Clock,
  Tag,
  Banknote,
  ChevronRight
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

// Premium category definitions (no emojis - clean icons implied by design)
export const FILTER_CATEGORIES = [
  { value: "food-delivery", label: "Food Delivery" },
  { value: "academic", label: "Academic Help" },
  { value: "tech-support", label: "Tech Support" },
  { value: "transport", label: "Transport" },
  { value: "shopping", label: "Shopping" },
  { value: "tutoring", label: "Tutoring" },
  { value: "laundry", label: "Laundry" },
  { value: "printing", label: "Printing" },
  { value: "moving", label: "Moving Help" },
  { value: "other", label: "Other" },
];

export const URGENCY_OPTIONS = [
  { value: "Flexible", label: "Flexible", sublabel: "No rush" },
  { value: "This week", label: "This Week", sublabel: "Within 7 days" },
  { value: "3 days", label: "3 Days", sublabel: "Moderate priority" },
  { value: "Today", label: "Today", sublabel: "Same day" },
  { value: "ASAP", label: "ASAP", sublabel: "Urgent" },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price_low", label: "Price: Low → High" },
  { value: "price_high", label: "Price: High → Low" },
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
}

// Premium Filter Option Component
function FilterOption({ 
  selected, 
  onClick, 
  children,
  sublabel
}: { 
  selected: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  sublabel?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full text-left px-4 py-3 rounded-2xl transition-all duration-200
        ${selected 
          ? "bg-white dark:bg-white/10 shadow-lg shadow-black/5 dark:shadow-black/20" 
          : "hover:bg-white/50 dark:hover:bg-white/5"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className={`font-medium ${selected ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}>
            {children}
          </span>
          {sublabel && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sublabel}</p>
          )}
        </div>
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
            >
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// Premium Section Header
function SectionHeader({ icon: Icon, title }: { icon: typeof Tag; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );
}

export function SearchFilterBar({ 
  filters, 
  onFiltersChange
}: SearchFilterBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [localPriceRange, setLocalPriceRange] = useState([filters.minPrice, filters.maxPrice]);
  
  // Sync local price range with filters
  useEffect(() => {
    setLocalPriceRange([filters.minPrice, filters.maxPrice]);
  }, [filters.minPrice, filters.maxPrice]);

  const activeFilterCount = countActiveFilters(filters);

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

  const applyPriceRange = (values: number[]) => {
    setLocalPriceRange(values);
    onFiltersChange({
      ...filters,
      minPrice: values[0],
      maxPrice: values[1],
    });
  };

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 10000) return "10,000+";
    return price.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar - Apple Style */}
      <div className="flex gap-3">
        {/* Search Input */}
        <div className="flex-1 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="w-full h-14 pl-12 pr-12 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-xl border-0 ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 focus-visible:ring-2 focus-visible:ring-emerald-500/50 text-base placeholder:text-zinc-400 transition-all duration-300"
            />
            <AnimatePresence>
              {filters.search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => updateFilter("search", "")}
                  className="absolute right-4 w-6 h-6 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"
                >
                  <X className="h-3 w-3 text-zinc-600 dark:text-zinc-300" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sort Dropdown - Minimal */}
        <Select value={filters.sortBy} onValueChange={(v) => updateFilter("sortBy", v)}>
          <SelectTrigger className="w-[160px] h-14 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-xl border-0 ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 hover:ring-zinc-300 dark:hover:ring-zinc-700 transition-all">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600 dark:text-zinc-300">{SORT_OPTIONS.find(o => o.value === filters.sortBy)?.label || "Sort"}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-0 shadow-2xl shadow-black/20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
            {SORT_OPTIONS.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value} 
                className="rounded-xl focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-pointer"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filters Button - Premium */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className={`
                h-14 px-5 rounded-2xl transition-all duration-300
                ${activeFilterCount > 0 
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25" 
                  : "bg-zinc-100/80 dark:bg-zinc-900/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 ring-1 ring-zinc-200/50 dark:ring-zinc-800/50"
                }
              `}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <span className="font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>

          {/* Premium Filter Sheet */}
          <SheetContent 
            side="right" 
            className="w-full sm:max-w-lg p-0 border-0 bg-zinc-50 dark:bg-zinc-950"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
              <SheetHeader className="px-6 py-5">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-2xl font-bold tracking-tight">Filters</SheetTitle>
                  <AnimatePresence>
                    {activeFilterCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearAllFilters}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl font-medium"
                        >
                          Reset All
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </SheetHeader>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-6 space-y-8 pb-32 overflow-y-auto max-h-[calc(100vh-180px)]">
              
              {/* Category Section */}
              <section>
                <SectionHeader icon={Tag} title="Category" />
                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-3xl p-2 space-y-1">
                  <FilterOption
                    selected={filters.category === ""}
                    onClick={() => updateFilter("category", "")}
                  >
                    All Categories
                  </FilterOption>
                  {FILTER_CATEGORIES.map((cat) => (
                    <FilterOption
                      key={cat.value}
                      selected={filters.category === cat.value}
                      onClick={() => updateFilter("category", cat.value)}
                    >
                      {cat.label}
                    </FilterOption>
                  ))}
                </div>
              </section>

              {/* Urgency Section */}
              <section>
                <SectionHeader icon={Clock} title="Urgency" />
                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-3xl p-2 space-y-1">
                  <FilterOption
                    selected={filters.urgency === ""}
                    onClick={() => updateFilter("urgency", "")}
                  >
                    Any Timeline
                  </FilterOption>
                  {URGENCY_OPTIONS.map((urg) => (
                    <FilterOption
                      key={urg.value}
                      selected={filters.urgency === urg.value}
                      onClick={() => updateFilter("urgency", urg.value)}
                      sublabel={urg.sublabel}
                    >
                      {urg.label}
                    </FilterOption>
                  ))}
                </div>
              </section>

              {/* Location Section */}
              <section>
                <SectionHeader icon={MapPin} title="Location" />
                <Select 
                  value={filters.location || "all"} 
                  onValueChange={(v) => updateFilter("location", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-full h-14 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border-0 ring-1 ring-zinc-200/30 dark:ring-zinc-800/30">
                    <div className="flex items-center justify-between w-full">
                      <span className={filters.location ? "text-zinc-900 dark:text-white" : "text-zinc-500"}>
                        {filters.location || "All Locations"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl max-h-72">
                    <SelectItem value="all" className="rounded-xl cursor-pointer">
                      All Locations
                    </SelectItem>
                    {LOCATION_OPTIONS.map((loc) => (
                      <SelectItem key={loc} value={loc} className="rounded-xl cursor-pointer">
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              {/* Price Range Section */}
              <section>
                <SectionHeader icon={Banknote} title="Price Range" />
                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-3xl p-6">
                  {/* Price Display */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-center">
                      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Min</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                        Rs. {formatPrice(localPriceRange[0])}
                      </p>
                    </div>
                    <div className="w-8 h-px bg-zinc-300 dark:bg-zinc-700" />
                    <div className="text-center">
                      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Max</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                        Rs. {formatPrice(localPriceRange[1])}
                      </p>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="px-1">
                    <Slider
                      value={localPriceRange}
                      onValueChange={setLocalPriceRange}
                      onValueCommit={applyPriceRange}
                      min={0}
                      max={10000}
                      step={100}
                      className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-zinc-200 dark:[&_[data-slot=slider-track]]:bg-zinc-800 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-emerald-500 [&_[data-slot=slider-range]]:to-teal-500 [&_[data-slot=slider-thumb]]:w-6 [&_[data-slot=slider-thumb]]:h-6 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-lg [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-emerald-500"
                    />
                  </div>

                  {/* Quick Select Chips */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {[
                      { label: "Under 500", min: 0, max: 500 },
                      { label: "500 - 1K", min: 500, max: 1000 },
                      { label: "1K - 3K", min: 1000, max: 3000 },
                      { label: "3K+", min: 3000, max: 10000 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPriceRange([preset.min, preset.max])}
                        className={`
                          px-3 py-1.5 rounded-full text-sm font-medium transition-all
                          ${localPriceRange[0] === preset.min && localPriceRange[1] === preset.max
                            ? "bg-emerald-500 text-white"
                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          }
                        `}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Fixed Bottom Action */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-50 via-zinc-50 dark:from-zinc-950 dark:via-zinc-950 to-transparent">
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-base shadow-xl shadow-zinc-900/20 dark:shadow-white/10 transition-all duration-300"
              >
                {activeFilterCount > 0 ? `Show Results` : "Done"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Pills - Minimal */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2"
          >
            {filters.category && (
              <motion.div layout>
                <Badge 
                  variant="secondary" 
                  className="pl-3 pr-2 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer group"
                  onClick={() => updateFilter("category", "")}
                >
                  {FILTER_CATEGORIES.find(c => c.value === filters.category)?.label}
                  <X className="h-3 w-3 ml-2 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                </Badge>
              </motion.div>
            )}
            {filters.urgency && (
              <motion.div layout>
                <Badge 
                  variant="secondary" 
                  className="pl-3 pr-2 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer group"
                  onClick={() => updateFilter("urgency", "")}
                >
                  {filters.urgency}
                  <X className="h-3 w-3 ml-2 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                </Badge>
              </motion.div>
            )}
            {filters.location && (
              <motion.div layout>
                <Badge 
                  variant="secondary" 
                  className="pl-3 pr-2 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer group"
                  onClick={() => updateFilter("location", "")}
                >
                  {filters.location}
                  <X className="h-3 w-3 ml-2 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                </Badge>
              </motion.div>
            )}
            {(filters.minPrice > 0 || filters.maxPrice < 10000) && (
              <motion.div layout>
                <Badge 
                  variant="secondary" 
                  className="pl-3 pr-2 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer group"
                  onClick={() => {
                    onFiltersChange({ ...filters, minPrice: 0, maxPrice: 10000 });
                    setLocalPriceRange([0, 10000]);
                  }}
                >
                  Rs. {formatPrice(filters.minPrice)} - {formatPrice(filters.maxPrice)}
                  <X className="h-3 w-3 ml-2 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                </Badge>
              </motion.div>
            )}
            
            {/* Clear All Button */}
            <motion.div layout>
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                Clear all
              </button>
            </motion.div>
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
