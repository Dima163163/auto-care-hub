import { useState } from 'react'
import { CalendarDays, ChevronDown, Clock3, Filter, MapPin, RotateCcw, Search } from 'lucide-react'
import { Dropdown } from '@/shared/ui/dropdown/Dropdown'
import {
    FilterField,
    FilterInput,
    FilterSelect,
} from '@/shared/ui/filter-controls'
import { useTranslation } from '@/shared/lib/useTranslation'
import { getLocalDateInputValue } from '@/shared/lib/getLocalDateInputValue'
import {
    type CabinetFilterState,
    isCabinetSortOptionValue,
    type CabinetSortOption,
} from '../lib/useCabinets'

type CabinetsFiltersProps = {
    onSortChange: (val: CabinetSortOption['value']) => void
    searchInput: string
    setSearchInput: (val: string) => void
    sortBy: CabinetSortOption['value'] | undefined
    sortOptions: CabinetSortOption[]
    filters: CabinetFilterState
    onFilterChange: <T extends keyof CabinetFilterState>(
        key: T,
        value: CabinetFilterState[T],
    ) => void
    onClearFilters: () => void
    hasAdvancedFilters: boolean
}

export function CabinetsFilters({
    searchInput,
    setSearchInput,
    sortBy,
    onSortChange,
    sortOptions,
    filters,
    onFilterChange,
    onClearFilters,
    hasAdvancedFilters,
}: CabinetsFiltersProps) {
    const { t } = useTranslation()
    const today = getLocalDateInputValue()
    const [isExpanded, setIsExpanded] = useState(hasAdvancedFilters)
    const handleDropdownSelect = (value: string) => {
        if (isCabinetSortOptionValue(value)) {
            onSortChange(value)
        }
    }

    return (
        <div className="mb-8 rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-md xl:mb-5 xl:p-3">
            <div className="hidden xl:grid xl:grid-cols-[minmax(260px,1.4fr)_minmax(145px,0.75fr)_minmax(160px,0.8fr)_minmax(205px,1fr)_auto] xl:items-center xl:gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        aria-label={t('cabinet.publicList.searchPlaceholder')}
                        placeholder={t('cabinet.publicList.searchPlaceholder')}
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none ring-primary transition focus:ring-2"
                    />
                </div>

                <span className="relative block">
                    <CalendarDays className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <FilterInput
                        type="date"
                        min={today}
                        value={filters.date}
                        onChange={(event) => onFilterChange('date', event.target.value)}
                        aria-label={t('booking.date')}
                        className="mt-0 rounded-md pl-9 pr-2"
                    />
                </span>

                <FilterSelect
                    value={filters.category}
                    onChange={(event) => onFilterChange('category', event.target.value)}
                    aria-label={t('cabinet.publicList.categoryLabel')}
                    className="mt-0 rounded-md"
                >
                    <option value="">{t('cabinet.publicList.allCategories')}</option>
                    <option value="beauty">{t('cabinet.publicList.categoryBeauty')}</option>
                    <option value="medical">{t('cabinet.publicList.categoryMedical')}</option>
                    <option value="consultation">{t('cabinet.publicList.categoryConsultation')}</option>
                    <option value="wellness">{t('cabinet.publicList.categoryWellness')}</option>
                    <option value="office">{t('cabinet.publicList.categoryOffice')}</option>
                </FilterSelect>

                <div className="grid grid-cols-2 gap-2">
                    <FilterInput
                        type="number"
                        min="0"
                        value={filters.minPrice}
                        onChange={(event) => onFilterChange('minPrice', event.target.value)}
                        placeholder={t('cabinet.publicList.minPrice')}
                        aria-label={t('cabinet.publicList.minPrice')}
                        className="mt-0 rounded-md"
                    />
                    <FilterInput
                        type="number"
                        min="0"
                        value={filters.maxPrice}
                        onChange={(event) => onFilterChange('maxPrice', event.target.value)}
                        placeholder={t('cabinet.publicList.maxPrice')}
                        aria-label={t('cabinet.publicList.maxPrice')}
                        className="mt-0 rounded-md"
                    />
                </div>

                <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded((expanded) => !expanded)}
                    className="flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-bold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <Filter className="size-4" />
                    {t('cabinet.publicList.advancedFilters')}
                </button>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between xl:hidden">
                <div className="relative max-w-md flex-1">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    aria-label={t('cabinet.publicList.searchPlaceholder')}
                    placeholder={t('cabinet.publicList.searchPlaceholder')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-12 w-full rounded-lg border-none bg-background/50 pl-11 pr-4 text-sm outline-none ring-1 ring-inset ring-border transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Filter className="size-4" />
                        <span className="hidden sm:inline-block">{t('cabinet.publicList.sortBy')}:</span>
                    </div>
                    <Dropdown
                        align="right"
                        value={sortBy}
                        onSelect={handleDropdownSelect}
                        items={sortOptions}
                        trigger={(triggerProps) => (
                            <button
                                {...triggerProps}
                                type="button"
                                className="flex h-12 min-w-[180px] items-center justify-between rounded-lg border-none bg-background/50 pl-4 pr-4 text-sm font-medium outline-none ring-1 ring-inset ring-border transition-all hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <span className="mr-2 truncate">
                                    {sortOptions.find((option) => option.value === sortBy)?.label}
                                </span>
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                        )}
                    />
                    <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setIsExpanded((expanded) => !expanded)}
                        className="flex h-12 items-center gap-2 rounded-lg border border-border bg-background/50 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <Filter className="size-4" />
                        {t('cabinet.publicList.advancedFilters')}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FilterField label={t('cabinet.publicList.cityLabel')}>
                        <span className="relative mt-2 block">
                            <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <FilterInput
                                value={filters.city}
                                onChange={(event) => onFilterChange('city', event.target.value)}
                                placeholder={t('cabinet.publicList.cityPlaceholder')}
                                className="pl-9 pr-3"
                            />
                        </span>
                    </FilterField>

                    <FilterField className="xl:hidden" label={t('cabinet.publicList.categoryLabel')}>
                        <FilterSelect
                            value={filters.category}
                            onChange={(event) => onFilterChange('category', event.target.value)}
                        >
                            <option value="">{t('cabinet.publicList.allCategories')}</option>
                            <option value="beauty">{t('cabinet.publicList.categoryBeauty')}</option>
                            <option value="medical">{t('cabinet.publicList.categoryMedical')}</option>
                            <option value="consultation">{t('cabinet.publicList.categoryConsultation')}</option>
                            <option value="wellness">{t('cabinet.publicList.categoryWellness')}</option>
                            <option value="office">{t('cabinet.publicList.categoryOffice')}</option>
                        </FilterSelect>
                    </FilterField>

                    <FilterField
                        as="div"
                        className="xl:hidden"
                        label={t('cabinet.publicList.priceRangeLabel')}
                    >
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <FilterInput
                                type="number"
                                min="0"
                                value={filters.minPrice}
                                onChange={(event) => onFilterChange('minPrice', event.target.value)}
                                placeholder={t('cabinet.publicList.minPrice')}
                                aria-label={t('cabinet.publicList.minPrice')}
                                className="mt-0"
                            />
                            <FilterInput
                                type="number"
                                min="0"
                                value={filters.maxPrice}
                                onChange={(event) => onFilterChange('maxPrice', event.target.value)}
                                placeholder={t('cabinet.publicList.maxPrice')}
                                aria-label={t('cabinet.publicList.maxPrice')}
                                className="mt-0"
                            />
                        </div>
                    </FilterField>

                    <FilterField label={t('cabinet.publicList.ratingLabel')}>
                        <FilterSelect
                            value={filters.minRating}
                            onChange={(event) => onFilterChange('minRating', event.target.value)}
                        >
                            <option value="">{t('cabinet.publicList.anyRating')}</option>
                            <option value="4">4+ {t('cabinet.publicList.stars')}</option>
                            <option value="4.5">4.5+ {t('cabinet.publicList.stars')}</option>
                        </FilterSelect>
                    </FilterField>

                    <FilterField label={t('cabinet.publicList.serviceLabel')}>
                        <FilterInput
                            value={filters.service}
                            onChange={(event) => onFilterChange('service', event.target.value)}
                            placeholder={t('cabinet.publicList.servicePlaceholder')}
                        />
                    </FilterField>

                    <FilterField className="xl:hidden" label={t('booking.date')}>
                        <span className="relative mt-2 block">
                            <CalendarDays className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <FilterInput
                                type="date"
                                min={today}
                                value={filters.date}
                                onChange={(event) => onFilterChange('date', event.target.value)}
                                aria-label={t('booking.date')}
                                className="pl-9 pr-3"
                            />
                        </span>
                    </FilterField>

                    <FilterField label={t('landing.availabilityDurationLabel')}>
                        <span className="relative mt-2 block">
                            <Clock3 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <FilterSelect
                                value={filters.duration}
                                onChange={(event) => onFilterChange('duration', event.target.value)}
                                className="pl-9"
                            >
                                <option value="">{t('landing.availabilityDurationPlaceholder')}</option>
                                {[30, 60, 90, 120].map((minutes) => (
                                    <option key={minutes} value={minutes}>
                                        {t('service.form.durationMinutes', { count: minutes })}
                                    </option>
                                ))}
                            </FilterSelect>
                        </span>
                    </FilterField>

                    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm font-semibold">
                        <input
                            type="checkbox"
                            checked={filters.availableToday}
                            onChange={(event) => onFilterChange('availableToday', event.target.checked)}
                            className="size-4 accent-primary"
                        />
                        {t('cabinet.publicList.availableToday')}
                    </label>

                    {hasAdvancedFilters && (
                        <button
                            type="button"
                            onClick={onClearFilters}
                            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-background"
                        >
                            <RotateCcw className="size-4" />
                            {t('cabinet.publicList.clearFilters')}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
